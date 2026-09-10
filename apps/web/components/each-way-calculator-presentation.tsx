import type { ReactNode } from "react";

import { CalculatorOutcomes, CalculatorOutcomeValueDisplay } from "@/components/calculator-outcomes";
import { CalculatorSegmentedControl } from "@/components/calculator-segmented-control";
import { CopyableFinancialValue } from "@/components/copyable-financial-value";
import { FinancialValue, FinancialValueReplayGroup } from "@/components/financial-value";
import type { EachWayColourScheme } from "@/lib/theme";

export type { EachWayColourScheme } from "@/lib/theme";

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

export function EachWayModeToggle({ mode, onChange }: { mode: EachWayPresentationMode; onChange: (mode: EachWayPresentationMode) => void }) {
  return <CalculatorSegmentedControl
    ariaLabel="Each Way calculator mode"
    onChange={onChange}
    options={(["Extra Place", "Each Way"] as const).map((option) => ({ label: option, value: option }))}
    value={mode}
  />;
}

export function EachWayColourSchemeToggle({ onChange, value }: { onChange: (value: EachWayColourScheme) => void; value: EachWayColourScheme }) {
  return <div aria-label="Extra Place colour theme" className="extra-place-theme-switch" data-pd-id="calculators.each-way.presentation-style" role="group">
    <button aria-label="Use Extra Place colour theme" aria-pressed={value === "ep"} className="extra-place-theme-switch-option" onClick={() => onChange("ep")} type="button">
      <span aria-hidden="true" className="material-symbols-outlined">chess_knight</span>
    </button>
    <button aria-label="Use Back and Lay colour theme" aria-pressed={value === "back-lay"} className="extra-place-theme-switch-option" onClick={() => onChange("back-lay")} type="button">
      <span aria-hidden="true" className="material-symbols-outlined">palette</span>
    </button>
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

export function EachWayLaySection({ children, kind, label, liability, quickChoices, stake }: {
  children: ReactNode;
  kind: "win" | "place";
  label: string;
  liability: string | null | undefined;
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
        <strong><CopyableFinancialValue dataPdId={`calculator.${kind}-lay-stake.copyable`} label={`${label} stake`} value={stake} /></strong>
        <span>Liability {neutralValue(liability)}</span>
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
  return <CalculatorOutcomes
    columns={["Bookmaker", "Exchange"]}
    inspectionId={inspectionId}
    rows={outcomes.map((outcome) => ({
      key: outcome.key,
      label: outcome.label,
      tone: outcome.key === "win" ? "primary" : outcome.key === "standard" ? "positive" : outcome.key === "extra" ? "warning" : "danger",
      components: [outcome.bookmaker, outcome.exchange],
      total: outcome.total,
      selected: selectedResult === outcome.result,
    }))}
    summary={<>
      <span>Outcome {selected ? <CalculatorOutcomeValueDisplay label="Selected outcome" value={selected.total} /> : "Select a finishing position"}</span>
      <span>Qualifying Loss <CalculatorOutcomeValueDisplay label="Qualifying loss" value={qualifyingLoss} /></span>
    </>}
  />;
}
