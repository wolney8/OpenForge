"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { FinancialValue, FinancialValueReplayGroup } from "@/components/financial-value";
import { apiBaseUrl } from "@/lib/api";
import { formatApiErrorBody } from "@/lib/api-error";
import { hasCompleteDecimalInputSyntax, getSportsbookOddsInputError, normalizeCalculatorOddsInput } from "@/lib/sportsbook-odds-input";

type BetType = "qualifying" | "free_bet" | "money_back";
type Strategy = "Standard" | "Underlay" | "Overlay" | "Custom" | "Partial Lay";
type Inputs = {
  betType: BetType; freeBetMode: "SNR" | "SR"; promotionMode: "standard" | "cashback";
  strategy: Strategy; backStake: string; backOdds: string; layOdds: string;
  exchangeCommission: string; manualLayStake: string; promotionValue: string;
  retentionPercent: string; underlayFactor: string; overlayFactor: string;
};
type Result = {
  result_kind: "reference"; calculation_state: string; calculator_family: "matched-betting";
  canonical_back_odds: string; canonical_lay_odds: string; selected_lay_stake: string;
  reference_lay_stake_standard: string; reference_lay_stake_underlay: string;
  reference_lay_stake_overlay: string; liability: string; pnl_if_back_wins: string;
  pnl_if_lay_wins: string; matched_result: string;
  promotion_trigger_result: string | null;
};

const defaults: Inputs = {
  betType: "qualifying", freeBetMode: "SNR", promotionMode: "standard", strategy: "Standard",
  backStake: "", backOdds: "", layOdds: "", exchangeCommission: "0.02", manualLayStake: "",
  promotionValue: "", retentionPercent: "70", underlayFactor: "0.928", overlayFactor: "1.300",
};
const families = [
  ["matched-betting", "Matched Betting", true], ["multi-lay", "Multi-Lay", false],
  ["each-way", "Each Way / Extra Place", false], ["sequential-lay", "Sequential Lay", false],
  ["early-payout", "Early Payout / 2UP", false], ["multiples", "Accumulator / Multiples", false],
  ["dutching", "Dutching", false], ["odds-converter", "Odds Converter / Probability", false],
  ["blackjack", "Blackjack Strategy", false],
] as const;

function readInitial(search: URLSearchParams): Inputs {
  const next = { ...defaults };
  for (const key of Object.keys(next) as (keyof Inputs)[]) {
    const value = search.get(key);
    if (value !== null) (next as Record<string, string>)[key] = value;
  }
  if (!["qualifying", "free_bet", "money_back"].includes(next.betType)) next.betType = "qualifying";
  if (!["Standard", "Underlay", "Overlay", "Custom", "Partial Lay"].includes(next.strategy)) next.strategy = "Standard";
  return next;
}

export function CalculatorWorkspace() {
  const search = useSearchParams();
  const [inputs, setInputs] = useState<Inputs>(() => readInitial(search));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [conversion, setConversion] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const requestVersionRef = useRef(0);
  const requestAbortRef = useRef<AbortController | null>(null);
  const errors = useMemo(() => validate(inputs), [inputs]);
  const invalid = Object.values(errors).some(Boolean);

  function update<K extends keyof Inputs>(field: K, value: Inputs[K]) {
    requestAbortRef.current?.abort(); requestAbortRef.current = null; requestVersionRef.current += 1;
    setInputs((current) => ({ ...current, [field]: value }));
    setTouched((current) => ({ ...current, [field]: true }));
    setResult(null); setError(""); setCopyFeedback(""); setConversion(""); setIsCalculating(false);
  }

  function normalizeOdds(field: "backOdds" | "layOdds") {
    const normalized = normalizeCalculatorOddsInput(inputs[field]);
    if (normalized.converted) {
      setInputs((current) => ({ ...current, [field]: normalized.canonicalValue }));
      setConversion(`${field === "backOdds" ? "Back" : "Lay"} odds converted to decimal ${normalized.canonicalValue}.`);
    }
  }

  async function calculate() {
    if (invalid || isCalculating) return;
    const version = ++requestVersionRef.current;
    const controller = new AbortController(); requestAbortRef.current = controller;
    setIsCalculating(true); setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/fund-manager/calculators/matched-betting/preview`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({
          bet_type: inputs.betType, free_bet_mode: inputs.freeBetMode, promotion_mode: inputs.promotionMode,
          strategy: inputs.strategy, back_stake: inputs.backStake, back_odds: inputs.backOdds,
          lay_odds: inputs.layOdds, exchange_commission: inputs.exchangeCommission,
          manual_lay_stake: inputs.manualLayStake, promotion_value: inputs.promotionValue,
          retention_percent: inputs.retentionPercent, underlay_factor: inputs.underlayFactor,
          overlay_factor: inputs.overlayFactor,
        }),
      });
      if (!response.ok) throw new Error(formatApiErrorBody(await response.text(), "Unable to calculate."));
      const next = (await response.json()) as Result;
      if (version === requestVersionRef.current) setResult(next);
    } catch (caught) {
      if (version === requestVersionRef.current && !(caught instanceof DOMException && caught.name === "AbortError")) {
        setResult(null); setError(caught instanceof Error ? caught.message : "Unable to calculate.");
      }
    } finally { if (version === requestVersionRef.current) { requestAbortRef.current = null; setIsCalculating(false); } }
  }

  useEffect(() => () => requestAbortRef.current?.abort(), []);
  async function copyLayStake() {
    if (!result) return;
    try { await navigator.clipboard.writeText(result.selected_lay_stake); setCopyFeedback(`Copied ${result.selected_lay_stake}`); }
    catch { setCopyFeedback("Unable to copy. Select the lay stake and copy it manually."); }
  }
  function openInNewTab() {
    const params = new URLSearchParams({ family: "matched-betting" });
    for (const [key, value] of Object.entries(inputs)) params.set(key, value);
    window.open(`/fund-manager/calculators?${params.toString()}`, "_blank", "noopener,noreferrer");
  }

  const showPromotion = inputs.betType === "money_back" || (inputs.betType === "qualifying" && inputs.promotionMode === "cashback");
  const showManualLay = inputs.strategy === "Custom" || inputs.strategy === "Partial Lay";
  return <section aria-labelledby="calculator-workspace-title" className="content-panel stack sportsbook-page-shell" data-pd-id="calculators.workspace">
    <div className="workflow-panel-header"><div><span className="eyebrow">Fund Manager calculators</span><h1 id="calculator-workspace-title">Matched Betting</h1></div><div className="table-action-group"><span className="table-chip table-chip-info">Reference only</span><button className="button-link icon-text-action" data-pd-id="calculators.open-new-tab" onClick={openInNewTab} type="button"><span aria-hidden="true" className="material-symbols-outlined">open_in_new</span><span>Open in new tab</span></button></div></div>
    <div aria-label="Calculator families" className="analytics-tab-list" role="tablist">{families.map(([id, label, available]) => <button aria-disabled={!available} aria-selected={available} className={`analytics-tab${available ? " is-active" : ""}`} data-pd-id={`calculators.family.${id}`} disabled={!available} key={id} role="tab" type="button">{label}{!available ? " · Planned" : ""}</button>)}</div>
    <div className="calculator-panel-shell"><div className="calculator-shell">
      <div className="calculator-band calculator-band-primary">
        <div className="ledger-calculator-mode-bar">
          <SelectField id="bet-type" label="Bet type" value={inputs.betType} onChange={(value) => update("betType", value as BetType)} options={[["qualifying", "Qualifying Bet"], ["free_bet", "Free Bet"], ["money_back", "Money Back if Bet Loses"]]} />
          <SelectField id="strategy" label="Strategy" value={inputs.strategy} onChange={(value) => update("strategy", value as Strategy)} options={[["Standard", "Standard"], ["Underlay", "Underlay"], ["Overlay", "Overlay"], ["Custom", "Custom"], ["Partial Lay", "Part Lay"]]} />
          {inputs.betType === "free_bet" ? <SelectField id="free-bet-mode" label="Free bet" value={inputs.freeBetMode} onChange={(value) => update("freeBetMode", value as "SNR" | "SR")} options={[["SNR", "Stake Not Returned"], ["SR", "Stake Returned"]]} /> : <SelectField id="promotion-mode" label="Offer" value={inputs.promotionMode} onChange={(value) => update("promotionMode", value as "standard" | "cashback")} options={inputs.betType === "money_back" ? [["standard", "Money Back"]] : [["standard", "Standard"], ["cashback", "Cashback"]]} disabled={inputs.betType === "money_back"} />}
        </div>
        <div className="form-grid">
          <section className="calculator-segment calculator-segment-back"><div className="calculator-segment-heading"><span className="eyebrow">Back bet</span></div><div className="calculator-segment-grid calculator-segment-grid-back">
            <Field error={touched.backStake ? errors.backStake : null} id="back-stake" label={inputs.betType === "free_bet" ? "Free bet value" : "Back stake"} onChange={(value) => update("backStake", value)} value={inputs.backStake} />
            <Field error={touched.backOdds ? errors.backOdds : null} id="back-odds" label="Back odds" onBlur={() => normalizeOdds("backOdds")} onChange={(value) => update("backOdds", value)} value={inputs.backOdds} />
          </div></section>
          <section className="calculator-segment calculator-segment-lay"><div className="calculator-segment-heading"><span className="eyebrow">Lay bet</span></div><div className="calculator-segment-grid calculator-segment-grid-back">
            <Field error={touched.layOdds ? errors.layOdds : null} id="lay-odds" label="Lay odds" onBlur={() => normalizeOdds("layOdds")} onChange={(value) => update("layOdds", value)} value={inputs.layOdds} />
            <Field error={touched.exchangeCommission ? errors.exchangeCommission : null} id="commission" label="Exchange commission" onChange={(value) => update("exchangeCommission", value)} supportingText="Decimal rate, for example 0.02" value={inputs.exchangeCommission} />
          </div></section>
        </div>
        {(showManualLay || showPromotion || inputs.strategy === "Underlay" || inputs.strategy === "Overlay") ? <div className="form-grid">
          {showManualLay ? <Field error={touched.manualLayStake ? errors.manualLayStake : null} id="manual-lay-stake" label="Explicit lay stake" onChange={(value) => update("manualLayStake", value)} value={inputs.manualLayStake} /> : null}
          {showPromotion ? <Field error={touched.promotionValue ? errors.promotionValue : null} id="promotion-value" label={inputs.betType === "money_back" ? "Maximum refund" : "Cashback value"} onChange={(value) => update("promotionValue", value)} value={inputs.promotionValue} /> : null}
          {inputs.betType === "money_back" ? <Field error={touched.retentionPercent ? errors.retentionPercent : null} id="retention-percent" label="Refund retention (%)" onChange={(value) => update("retentionPercent", value)} value={inputs.retentionPercent} /> : null}
          {inputs.betType === "free_bet" && inputs.strategy === "Underlay" ? <Field error={touched.underlayFactor ? errors.underlayFactor : null} id="underlay-factor" label="Underlay factor" onChange={(value) => update("underlayFactor", value)} value={inputs.underlayFactor} /> : null}
          {inputs.betType === "free_bet" && inputs.strategy === "Overlay" ? <Field error={touched.overlayFactor ? errors.overlayFactor : null} id="overlay-factor" label="Overlay factor" onChange={(value) => update("overlayFactor", value)} value={inputs.overlayFactor} /> : null}
        </div> : null}
        {inputs.strategy === "Partial Lay" ? <p className="field-hint">One explicit part-lay amount is supported by the current contract. Multiple execution legs remain pending contract evidence.</p> : null}
        {conversion ? <p className="field-hint" role="status">{conversion}</p> : null}
        <div className="table-action-group"><button className="modal-primary-button icon-text-action" data-pd-id="calculators.matched-betting.calculate" disabled={invalid || isCalculating} onClick={() => void calculate()} type="button">{isCalculating ? <span aria-hidden="true" className="button-spinner" /> : <span aria-hidden="true" className="material-symbols-outlined">calculate</span>}<span>{isCalculating ? "Calculating..." : "Calculate"}</span></button></div>
        {error ? <p className="error-text" role="alert">{error}</p> : null}
      </div>
      {result ? <div className="calculator-band calculator-band-secondary" data-pd-id="calculators.matched-betting.results"><div className="calculator-panel-card calculator-result-panel"><FinancialValueReplayGroup><article className="calculator-result-card"><div className="calculator-result-card-heading"><strong>{inputs.strategy} reference</strong></div><dl className="calculator-result-card-values"><ResultValue label="Lay stake required" value={result.selected_lay_stake} /><ResultValue label="Liability" value={result.liability} /><ResultValue label="If bookmaker wins" value={result.pnl_if_back_wins} /><ResultValue label="If exchange wins" value={result.pnl_if_lay_wins} />{result.promotion_trigger_result ? <ResultValue label={inputs.betType === "money_back" ? "If refund triggers" : "If cashback triggers"} value={result.promotion_trigger_result} /> : null}<ResultValue label="Matched result" value={result.matched_result} /></dl><button className="review-chip review-chip-copy calculator-result-copy" data-pd-id="calculators.matched-betting.copy-lay-stake" onClick={() => void copyLayStake()} type="button"><span aria-hidden="true" className="material-symbols-outlined">content_copy</span><span>Copy Lay Stake</span></button>{copyFeedback ? <p className="calculator-copy-feedback" role="status">{copyFeedback}</p> : null}</article></FinancialValueReplayGroup></div></div> : null}
    </div></div>
  </section>;
}

function validate(inputs: Inputs): Record<string, string | null> {
  const amount = (value: string, required: string) => value === "" ? required : !hasCompleteDecimalInputSyntax(value) ? "Enter a decimal amount using a full stop, for example 10.50." : Number(value) <= 0 ? "Enter an amount greater than zero." : null;
  const decimalRange = (value: string, min: number, max: number, message: string) => !hasCompleteDecimalInputSyntax(value) || Number(value) < min || Number(value) > max ? message : null;
  return {
    backStake: amount(inputs.backStake, "Enter a back stake."),
    backOdds: getSportsbookOddsInputError(inputs.backOdds, { required: true }),
    layOdds: getSportsbookOddsInputError(inputs.layOdds, { required: true }),
    exchangeCommission: decimalRange(inputs.exchangeCommission, 0, 1, "Enter commission as a decimal from 0 to 1, for example 0.02."),
    manualLayStake: inputs.strategy === "Custom" || inputs.strategy === "Partial Lay" ? amount(inputs.manualLayStake, "Enter the explicit lay stake.") : null,
    promotionValue: inputs.betType === "money_back" || (inputs.betType === "qualifying" && inputs.promotionMode === "cashback") ? amount(inputs.promotionValue, "Enter the cashback or refund value.") : null,
    retentionPercent: inputs.betType === "money_back" ? decimalRange(inputs.retentionPercent, 0, 100, "Enter a percentage from 0 to 100.") : null,
    underlayFactor: inputs.strategy === "Underlay" ? decimalRange(inputs.underlayFactor, Number.MIN_VALUE, Infinity, "Enter a factor greater than zero.") : null,
    overlayFactor: inputs.strategy === "Overlay" ? decimalRange(inputs.overlayFactor, Number.MIN_VALUE, Infinity, "Enter a factor greater than zero.") : null,
  };
}

function Field({ error, id, label, onBlur, onChange, supportingText, value }: { error: string | null; id: string; label: string; onBlur?: () => void; onChange: (value: string) => void; supportingText?: string; value: string }) {
  const errorId = `calculator-${id}-error`;
  return <label className={`field-control${error ? " is-invalid" : ""}`} htmlFor={`calculator-${id}`}><span>{label}</span><input aria-describedby={error ? errorId : undefined} aria-invalid={Boolean(error)} data-pd-id={`calculators.matched-betting.${id}`} id={`calculator-${id}`} inputMode="decimal" onBlur={onBlur} onChange={(event) => onChange(event.target.value)} type="text" value={value} />{error ? <span className="field-validation-text" id={errorId} role="alert">{error}</span> : supportingText ? <span className="field-support-text">{supportingText}</span> : null}</label>;
}
function SelectField({ disabled = false, id, label, onChange, options, value }: { disabled?: boolean; id: string; label: string; onChange: (value: string) => void; options: readonly (readonly [string, string])[]; value: string }) {
  return <label className="field-control ledger-calculator-mode-field" htmlFor={`calculator-${id}`}><span>{label}</span><select data-pd-id={`calculators.matched-betting.${id}`} disabled={disabled} id={`calculator-${id}`} onChange={(event) => onChange(event.target.value)} value={value}>{options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}</select></label>;
}
function ResultValue({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd><FinancialValue label={label} value={value} /></dd></div>; }
