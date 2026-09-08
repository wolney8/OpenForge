import type { ReactNode } from "react";

import { FinancialValue, FinancialValueReplayGroup } from "@/components/financial-value";
import { formatFinancialValue } from "@/lib/financial-display";

export type EachWayPresentationMode = "Each Way" | "Extra Place";

export type EachWayOutcomeRow = {
  key: string;
  label: string;
  bookmaker: Array<string | null | undefined>;
  exchange: Array<string | null | undefined>;
  total: string | null | undefined;
  result: string;
};

function asNumber(value: string | null | undefined) {
  const parsed = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(parsed)
    ? null
    : parsed;
}

function neutralValue(value: string | null | undefined) {
  const parsed = asNumber(value);
  return <span className="extra-place-stake-value">{parsed === null ? "£ -" : <FinancialValue tone="inherit" value={parsed} />}</span>;
}

function matrixValue(value: string | null | undefined) {
  const parsed = asNumber(value);
  return <span className="extra-place-matrix-value">{parsed === null ? "£ -" : <FinancialValue value={parsed} />}</span>;
}

export function EachWayModeToggle({ mode, onChange }: { mode: EachWayPresentationMode; onChange: (mode: EachWayPresentationMode) => void }) {
  return <div aria-label="Each Way calculator mode" className="extra-place-bet-type-toggle" role="group">
    {(["Each Way", "Extra Place"] as const).map((option) => <button aria-pressed={mode === option} className="extra-place-bet-type-toggle-option" key={option} onClick={() => onChange(option)} type="button">{option}</button>)}
  </div>;
}

export function EachWayBackBetSection({ children, placeTerms }: { children: ReactNode; placeTerms: ReactNode }) {
  return <section className="calculator-segment calculator-segment-back extra-place-back-segment">
    <h3>Back Bet</h3>
    <div className="form-grid">{children}</div>
    {placeTerms}
  </section>;
}

export function EachWayPlaceTermsSection({ children, quickChoices, summary }: { children: ReactNode; quickChoices?: ReactNode; summary: ReactNode }) {
  return <div className="extra-place-place-terms">
    <strong className="extra-place-place-terms-title">Place Terms</strong>
    <div className="extra-place-place-terms-inputs">{children}</div>
    <p className="extra-place-stake-explainer">{summary}</p>
    {quickChoices}
  </div>;
}

export function EachWayStakeSummary({ stake }: { stake: string }) {
  return <p className="extra-place-stake-explainer">
    {neutralValue(stake)} each way. Total bookmaker stake: {neutralValue(String((asNumber(stake) ?? 0) * 2))}.
  </p>;
}

export function EachWayTermField({ dataPdId, inputId, onChange, quickChoices, value }: {
  dataPdId?: string;
  inputId: string;
  onChange: (value: string) => void;
  quickChoices?: ReactNode;
  value: string;
}) {
  return <div className="extra-place-field-with-chips">
    <label className="field-control" htmlFor={inputId}>
      <span>Each-Way Terms</span>
      <div className="extra-place-term-input">
        <span>1 /</span>
        <input aria-label="Each-way term denominator" data-pd-id={dataPdId} id={inputId} inputMode="numeric" onChange={(event) => onChange(event.target.value.replace(/[^0-9]/g, ""))} value={value} />
      </div>
    </label>
    {quickChoices}
  </div>;
}

export function EachWayLaySection({ children, kind, label, liability, onCopy, quickChoices, stake }: {
  children: ReactNode;
  kind: "win" | "place";
  label: string;
  liability: string | null | undefined;
  onCopy: (value: string | null | undefined) => void;
  quickChoices?: ReactNode;
  stake: string | null | undefined;
}) {
  return <section className={`calculator-segment calculator-segment-lay extra-place-lay-segment extra-place-lay-${kind}`}>
    <h3>{label}</h3>
    <div className="form-grid">{children}</div>
    {quickChoices}
    <FinancialValueReplayGroup>
      <div className="extra-place-calculated-stake">
        <span>Calculated Lay Stake</span>
        <strong>{neutralValue(stake)}</strong>
        <span>Liability {neutralValue(liability)}</span>
        <button className="review-chip extra-place-copy-button" disabled={!stake} onClick={() => void onCopy(stake)} type="button">
          <span aria-hidden="true" className="material-symbols-outlined">content_copy</span>
          <span>Copy stake</span>
        </button>
      </div>
    </FinancialValueReplayGroup>
  </section>;
}

export function EachWayOutcomeMatrix({ inspectionId = "extra-place.outcome-matrix", outcomes, qualifyingLoss, selectedResult }: {
  inspectionId?: string;
  outcomes: EachWayOutcomeRow[];
  qualifyingLoss: string | null | undefined;
  selectedResult: string;
}) {
  const selected = outcomes.find((outcome) => outcome.result === selectedResult);
  return <section className="extra-place-outcome-matrix calculator-result-card" data-pd-id={inspectionId}>
    <div className="calculator-result-card-heading"><h3>Outcomes</h3></div>
    <div className="extra-place-outcome-table" role="table">
      {outcomes.map((outcome) => <FinancialValueReplayGroup key={outcome.key}>
        <div aria-label={`${outcome.label}: bookmaker ${formatFinancialValue(asNumber(outcome.bookmaker[0]) ?? 0)} and ${formatFinancialValue(asNumber(outcome.bookmaker[1]) ?? 0)}; exchange ${formatFinancialValue(asNumber(outcome.exchange[0]) ?? 0)} and ${formatFinancialValue(asNumber(outcome.exchange[1]) ?? 0)}; total ${formatFinancialValue(asNumber(outcome.total) ?? 0)}`} className={`extra-place-outcome-row extra-place-outcome-${outcome.key}${selectedResult === outcome.result ? " is-selected" : ""}`} role="row">
          <strong>{outcome.label}</strong>
          <span>{matrixValue(outcome.bookmaker[0])} <b>+</b> {matrixValue(outcome.bookmaker[1])}</span>
          <span>{matrixValue(outcome.exchange[0])} <b>+</b> {matrixValue(outcome.exchange[1])}</span>
          <strong>{matrixValue(outcome.total)}</strong>
        </div>
      </FinancialValueReplayGroup>)}
    </div>
    <div className="extra-place-outcome-summary">
      <span>Outcome {selected ? matrixValue(selected.total) : "Select a finishing position"}</span>
      <span>Qualifying Loss {matrixValue(qualifyingLoss)}</span>
    </div>
  </section>;
}
