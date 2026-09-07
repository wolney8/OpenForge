"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { FinancialValue, FinancialValueReplayGroup } from "@/components/financial-value";
import { apiBaseUrl } from "@/lib/api";
import { formatApiErrorBody } from "@/lib/api-error";
import {
  getStandardQualifyingErrors,
  hasStandardQualifyingErrors,
  type StandardQualifyingInputs,
} from "@/lib/standard-qualifying-calculator";

type StandardQualifyingResult = {
  profile_id: string;
  result_kind: "reference";
  calculation_state: string;
  reference_lay_stake: string;
  liability: string;
  pnl_if_back_wins: string;
  pnl_if_lay_wins: string;
  matched_result: string;
};

const initialInputs: StandardQualifyingInputs = {
  backStake: "",
  backOdds: "",
  layOdds: "",
  exchangeCommission: "",
};

const calculatorFamilies = [{ id: "standard-qualifying", label: "Standard Qualifying" }] as const;

export function CalculatorWorkspace({ profileId }: { profileId: string }) {
  const [inputs, setInputs] = useState(initialInputs);
  const [touched, setTouched] = useState<Partial<Record<keyof StandardQualifyingInputs, boolean>>>({});
  const [result, setResult] = useState<StandardQualifyingResult | null>(null);
  const [error, setError] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const requestVersionRef = useRef(0);
  const requestAbortRef = useRef<AbortController | null>(null);
  const errors = useMemo(() => getStandardQualifyingErrors(inputs), [inputs]);
  const isInvalid = hasStandardQualifyingErrors(errors);

  function update(field: keyof StandardQualifyingInputs, value: string) {
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    requestVersionRef.current += 1;
    setInputs((current) => ({ ...current, [field]: value }));
    setTouched((current) => ({ ...current, [field]: true }));
    setResult(null);
    setError("");
    setCopyFeedback("");
    setIsCalculating(false);
  }

  async function calculate() {
    if (isInvalid || isCalculating) return;
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    const controller = new AbortController();
    requestAbortRef.current = controller;
    setIsCalculating(true);
    setError("");
    try {
      const response = await fetch(
        `${apiBaseUrl}/profiles/${profileId}/calculators/standard-qualifying/preview`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            back_stake: inputs.backStake,
            back_odds: inputs.backOdds,
            lay_odds: inputs.layOdds,
            exchange_commission: inputs.exchangeCommission,
          }),
        }
      );
      if (!response.ok) throw new Error(formatApiErrorBody(await response.text(), "Unable to calculate."));
      const nextResult = (await response.json()) as StandardQualifyingResult;
      if (requestVersion === requestVersionRef.current) setResult(nextResult);
    } catch (caught) {
      if (requestVersion === requestVersionRef.current) {
        setResult(null);
        setError(caught instanceof Error ? caught.message : "Unable to calculate.");
      }
    } finally {
      if (requestVersion === requestVersionRef.current) {
        requestAbortRef.current = null;
        setIsCalculating(false);
      }
    }
  }

  useEffect(() => () => requestAbortRef.current?.abort(), []);

  async function copyLayStake() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.reference_lay_stake);
      setCopyFeedback(`Copied ${result.reference_lay_stake}`);
    } catch {
      setCopyFeedback("Unable to copy. Select the lay stake and copy it manually.");
    }
  }

  return (
    <section aria-labelledby="calculator-workspace-title" className="content-panel stack sportsbook-page-shell" data-pd-id="calculators.workspace">
      <div className="workflow-panel-header">
        <div>
          <span className="eyebrow">Calculators</span>
          <h1 id="calculator-workspace-title">Standard Qualifying</h1>
        </div>
        <span className="table-chip table-chip-info">Reference only</span>
      </div>

      <div aria-label="Calculator families" className="analytics-tab-list" role="tablist">
        {calculatorFamilies.map((family) => (
          <button aria-selected="true" className="analytics-tab is-active" data-pd-id={`calculators.family.${family.id}`} key={family.id} role="tab" type="button">
            {family.label}
          </button>
        ))}
      </div>

      <div className="calculator-panel-shell">
        <div className="calculator-shell">
          <div className="calculator-band calculator-band-primary">
            <div className="form-grid">
              <section className="calculator-segment calculator-segment-back">
                <div className="calculator-segment-heading"><span className="eyebrow">Back bet</span></div>
                <div className="calculator-segment-grid calculator-segment-grid-back">
                  <CalculatorField error={touched.backStake ? errors.backStake : null} id="calculator-back-stake" label="Back stake" onChange={(value) => update("backStake", value)} value={inputs.backStake} />
                  <CalculatorField error={touched.backOdds ? errors.backOdds : null} id="calculator-back-odds" label="Back odds" onChange={(value) => update("backOdds", value)} value={inputs.backOdds} />
                </div>
              </section>
              <section className="calculator-segment calculator-segment-lay">
                <div className="calculator-segment-heading"><span className="eyebrow">Lay bet</span></div>
                <div className="calculator-segment-grid calculator-segment-grid-back">
                  <CalculatorField error={touched.layOdds ? errors.layOdds : null} id="calculator-lay-odds" label="Lay odds" onChange={(value) => update("layOdds", value)} value={inputs.layOdds} />
                  <CalculatorField error={touched.exchangeCommission ? errors.exchangeCommission : null} id="calculator-commission" label="Exchange commission" onChange={(value) => update("exchangeCommission", value)} supportingText="Decimal rate, for example 0.02" value={inputs.exchangeCommission} />
                </div>
              </section>
            </div>
            <div className="table-action-group">
              <button className="modal-primary-button icon-text-action" data-pd-id="calculators.standard-qualifying.calculate" disabled={isInvalid || isCalculating} onClick={() => void calculate()} type="button">
                {isCalculating ? <span aria-hidden="true" className="button-spinner" /> : <span aria-hidden="true" className="material-symbols-outlined">calculate</span>}
                <span>{isCalculating ? "Calculating..." : "Calculate"}</span>
              </button>
            </div>
            {error ? <p className="error-text" role="alert">{error}</p> : null}
          </div>

          {result ? (
            <div className="calculator-band calculator-band-secondary" data-pd-id="calculators.standard-qualifying.results">
              <div className="calculator-panel-card calculator-result-panel">
                <FinancialValueReplayGroup>
                  <article className="calculator-result-card">
                    <div className="calculator-result-card-heading"><strong>Standard match</strong></div>
                    <dl className="calculator-result-card-values">
                      <ResultValue label="Recommended lay stake" value={result.reference_lay_stake} />
                      <ResultValue label="Liability" value={result.liability} />
                      <ResultValue label="If bookmaker wins" value={result.pnl_if_back_wins} />
                      <ResultValue label="If exchange wins" value={result.pnl_if_lay_wins} />
                      <ResultValue label="Matched result" value={result.matched_result} />
                    </dl>
                    <button className="review-chip review-chip-copy calculator-result-copy" data-pd-id="calculators.standard-qualifying.copy-lay-stake" onClick={() => void copyLayStake()} type="button">
                      <span aria-hidden="true" className="material-symbols-outlined">content_copy</span>
                      <span>Copy Lay Stake</span>
                    </button>
                    {copyFeedback ? <p className="calculator-copy-feedback" role="status">{copyFeedback}</p> : null}
                  </article>
                </FinancialValueReplayGroup>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function CalculatorField({ error, id, label, onChange, supportingText, value }: { error: string | null; id: string; label: string; onChange: (value: string) => void; supportingText?: string; value: string }) {
  const errorId = `${id}-error`;
  return (
    <label className={`field-control${error ? " is-invalid" : ""}`} htmlFor={id}>
      <span>{label}</span>
      <input aria-describedby={error ? errorId : undefined} aria-invalid={Boolean(error)} data-pd-id={`calculators.standard-qualifying.${id.replace("calculator-", "")}`} id={id} inputMode="decimal" onChange={(event) => onChange(event.target.value)} type="text" value={value} />
      {error ? <span className="field-validation-text" id={errorId} role="alert">{error}</span> : supportingText ? <span className="field-support-text">{supportingText}</span> : null}
    </label>
  );
}

function ResultValue({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd><FinancialValue label={label} value={value} /></dd></div>;
}
