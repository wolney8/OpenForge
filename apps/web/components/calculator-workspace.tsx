"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { FinancialValue, FinancialValueReplayGroup } from "@/components/financial-value";
import { QuickSelectRail } from "@/components/quick-select-rail";
import { apiBaseUrl } from "@/lib/api";
import { formatApiErrorBody } from "@/lib/api-error";
import { hasCompleteDecimalInputSyntax, getSportsbookOddsInputError, normalizeCalculatorOddsInput } from "@/lib/sportsbook-odds-input";

type BetType = "qualifying" | "free_bet" | "money_back";
type Strategy = "Standard" | "Underlay" | "Overlay" | "Custom" | "Partial Lay";
type Family = "matched-betting" | "multi-lay" | "each-way" | "sequential-lay" | "early-payout" | "multiples" | "dutching" | "odds-converter" | "blackjack";
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
const families: Array<{ label: string; value: Family }> = [
  { value: "matched-betting", label: "Matched Betting" },
  { value: "multi-lay", label: "Multi-Lay" },
  { value: "each-way", label: "Each Way" },
  { value: "sequential-lay", label: "Sequential Lay · Planned" },
  { value: "early-payout", label: "Early Payout / 2UP · Planned" },
  { value: "multiples", label: "Multiples / Accumulator · Planned" },
  { value: "dutching", label: "Dutching · Planned" },
  { value: "odds-converter", label: "Odds / Probability · Planned" },
  { value: "blackjack", label: "Blackjack Strategy · Planned" },
];

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
  const requestedFamily = search.get("family") as Family | null;
  const [family, setFamily] = useState<Family>(families.some((item) => item.value === requestedFamily) ? requestedFamily! : "matched-betting");
  const popoutStateRef = useRef(new URLSearchParams({ family }));
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
    const params = new URLSearchParams(popoutStateRef.current);
    params.set("family", family);
    if (family === "matched-betting") for (const [key, value] of Object.entries(inputs)) params.set(key, value);
    window.open(`/fund-manager/calculators?${params.toString()}`, "_blank", "noopener,noreferrer");
  }

  const showPromotion = inputs.betType === "money_back" || (inputs.betType === "qualifying" && inputs.promotionMode === "cashback");
  const showManualLay = inputs.strategy === "Custom" || inputs.strategy === "Partial Lay";
  return <section aria-labelledby="calculator-workspace-title" className="content-panel stack sportsbook-page-shell" data-pd-id="calculators.workspace">
    <div className="workflow-panel-header"><div><span className="eyebrow">Fund Manager</span><h1 id="calculator-workspace-title">Calculators</h1></div><div className="table-action-group"><span className="table-chip table-chip-info">Reference only</span><button className="button-link icon-text-action" data-pd-id="calculators.open-new-tab" onClick={openInNewTab} type="button"><span aria-hidden="true" className="material-symbols-outlined">open_in_new</span><span>Open in new tab</span></button></div></div>
    <QuickSelectRail ariaLabel="Calculator families" choices={families} onSelect={(value) => { const next = value as Family; popoutStateRef.current = new URLSearchParams({ family: next }); setFamily(next); }} selectedValues={[family]} />
    {family === "matched-betting" ? <div className="calculator-panel-shell"><div className="calculator-shell">
      <h2>Matched Betting</h2>
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
    </div></div> : family === "multi-lay" ? <MultiLayCalculator onState={(params) => { popoutStateRef.current = params; }} search={search} /> : family === "each-way" ? <EachWayCalculator onState={(params) => { popoutStateRef.current = params; }} search={search} /> : <div className="calculator-panel-shell"><div className="calculator-band calculator-band-primary"><h2>{families.find((item) => item.value === family)?.label.replace(" · Planned", "")}</h2><p className="empty-copy">This calculator family remains in the approved queue.</p></div></div>}
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

type MultiLayInputs = {
  allocation: "standard" | "underlay";
  backStake: string;
  backOdds: string;
  commission: string;
  outcomes: Array<{ label: string; layOdds: string }>;
};
type MultiLayResult = {
  calculation_state: string;
  branches: Array<{ label: string; lay_odds: string; lay_stake: string; liability: string; outcome_value: string }>;
  no_selection_value: string;
  matched_result: string;
  total_liability: string;
};

function readMultiLay(search: URLSearchParams): MultiLayInputs {
  const fallback: MultiLayInputs = {
    allocation: "standard",
    backStake: "",
    backOdds: "",
    commission: "0.02",
    outcomes: [{ label: "Outcome 1", layOdds: "" }, { label: "Outcome 2", layOdds: "" }],
  };
  try {
    const parsed = JSON.parse(search.get("multiLay") ?? "null") as MultiLayInputs | null;
    return parsed && Array.isArray(parsed.outcomes) && parsed.outcomes.length >= 2 && parsed.outcomes.length <= 3 ? parsed : fallback;
  } catch { return fallback; }
}

function MultiLayCalculator({ onState, search }: { onState: (params: URLSearchParams) => void; search: URLSearchParams }) {
  const [inputs, setInputs] = useState<MultiLayInputs>(() => readMultiLay(search));
  const [result, setResult] = useState<MultiLayResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");
  const requestVersion = useRef(0);
  const invalid = !isPositiveAmount(inputs.backStake) || Boolean(getSportsbookOddsInputError(inputs.backOdds, { required: true })) || commissionError(inputs.commission) !== null || inputs.outcomes.some((outcome) => !outcome.label.trim() || Boolean(getSportsbookOddsInputError(outcome.layOdds, { required: true })));
  useEffect(() => {
    const params = new URLSearchParams({ family: "multi-lay", multiLay: JSON.stringify(inputs) });
    onState(params);
  }, [inputs, onState]);
  function update(next: MultiLayInputs) { requestVersion.current += 1; setInputs(next); setResult(null); setError(""); setCopyFeedback(""); setBusy(false); }
  function updateOutcome(index: number, field: "label" | "layOdds", value: string) {
    update({ ...inputs, outcomes: inputs.outcomes.map((outcome, at) => at === index ? { ...outcome, [field]: value } : outcome) });
  }
  function normalizeOutcome(index: number) {
    const normalized = normalizeCalculatorOddsInput(inputs.outcomes[index].layOdds);
    if (normalized.converted) updateOutcome(index, "layOdds", normalized.canonicalValue);
  }
  async function calculate() {
    if (invalid || busy) return;
    const version = ++requestVersion.current; setBusy(true); setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/fund-manager/calculators/multi-lay/preview`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ allocation: inputs.allocation, back_stake: inputs.backStake, back_odds: inputs.backOdds, exchange_commission: inputs.commission, outcomes: inputs.outcomes.map((outcome) => ({ label: outcome.label, lay_odds: outcome.layOdds })) }) });
      if (!response.ok) throw new Error(formatApiErrorBody(await response.text(), "Unable to calculate Multi-Lay."));
      const next = await response.json() as MultiLayResult; if (version === requestVersion.current) setResult(next);
    } catch (caught) { if (version === requestVersion.current) setError(caught instanceof Error ? caught.message : "Unable to calculate Multi-Lay."); }
    finally { if (version === requestVersion.current) setBusy(false); }
  }
  return <div className="calculator-panel-shell"><div className="calculator-shell">
    <div className="calculator-band calculator-band-primary stack"><div className="workflow-panel-header"><div><h2>Multi-Lay</h2></div></div>
      <div className="ledger-calculator-mode-bar"><SelectField id="multi-allocation" label="Matching mode" value={inputs.allocation} onChange={(value) => update({ ...inputs, allocation: value as MultiLayInputs["allocation"] })} options={[["standard", "Standard"], ["underlay", "Underlay"]]} /></div>
      <div className="calculator-segment calculator-segment-back"><div className="calculator-segment-grid calculator-segment-grid-back"><Field error={null} id="multi-back-stake" label="Back stake" onChange={(value) => update({ ...inputs, backStake: value })} value={inputs.backStake} /><Field error={getSportsbookOddsInputError(inputs.backOdds, { required: false })} id="multi-back-odds" label="Back odds" onBlur={() => { const normalized = normalizeCalculatorOddsInput(inputs.backOdds); if (normalized.converted) update({ ...inputs, backOdds: normalized.canonicalValue }); }} onChange={(value) => update({ ...inputs, backOdds: value })} value={inputs.backOdds} /></div></div>
      <div className="calculator-segment calculator-segment-lay stack"><div className="calculator-segment-heading"><h3>Mutually exclusive lay outcomes</h3><button className="button-link icon-text-action" disabled={inputs.outcomes.length >= 3} onClick={() => update({ ...inputs, outcomes: [...inputs.outcomes, { label: `Outcome ${inputs.outcomes.length + 1}`, layOdds: "" }] })} type="button"><span aria-hidden="true" className="material-symbols-outlined">add</span><span>Add outcome</span></button></div>
        {inputs.outcomes.map((outcome, index) => <div className="calculator-segment-grid calculator-segment-grid-lay" data-pd-id={`calculators.multi-lay.outcome-${index + 1}`} key={index}><Field error={outcome.label.trim() ? null : "Enter an outcome name."} id={`multi-outcome-${index + 1}-label`} inputMode="text" label={`Outcome ${index + 1}`} onChange={(value) => updateOutcome(index, "label", value)} value={outcome.label} /><Field error={getSportsbookOddsInputError(outcome.layOdds, { required: false })} id={`multi-outcome-${index + 1}-odds`} label="Lay odds" onBlur={() => normalizeOutcome(index)} onChange={(value) => updateOutcome(index, "layOdds", value)} value={outcome.layOdds} />{index >= 2 ? <button aria-label={`Remove ${outcome.label || `outcome ${index + 1}`}`} className="icon-button compact-action" onClick={() => update({ ...inputs, outcomes: inputs.outcomes.filter((_, at) => at !== index) })} type="button"><span aria-hidden="true" className="material-symbols-outlined">remove</span></button> : <span aria-hidden="true" />}</div>)}
        <Field error={commissionError(inputs.commission)} id="multi-commission" label="Exchange commission" onChange={(value) => update({ ...inputs, commission: value })} value={inputs.commission} />
      </div>
      <div className="table-action-group"><button className="modal-primary-button icon-text-action" disabled={invalid || busy} onClick={() => void calculate()} type="button">{busy ? <span aria-hidden="true" className="button-spinner" /> : <span aria-hidden="true" className="material-symbols-outlined">calculate</span>}<span>{busy ? "Calculating..." : "Calculate Multi-Lay"}</span></button></div>{error ? <p className="error-text" role="alert">{error}</p> : null}
    </div>
    {result ? <div className="calculator-band calculator-band-secondary"><FinancialValueReplayGroup><article className="calculator-result-card"><div className="calculator-result-card-heading"><strong>Multi-Lay reference</strong></div><dl className="calculator-result-card-values">{result.branches.map((branch) => <div key={branch.label}><dt>{branch.label} lay stake</dt><dd><FinancialValue label={`${branch.label} lay stake`} value={branch.lay_stake} /></dd><dt>Liability</dt><dd><FinancialValue label={`${branch.label} liability`} value={branch.liability} /></dd><dt>Outcome value</dt><dd><FinancialValue label={`${branch.label} outcome value`} value={branch.outcome_value} /></dd><button className="review-chip review-chip-copy" onClick={() => void copyCalculatorValue(branch.lay_stake, setCopyFeedback)} type="button">Copy stake</button></div>)}<ResultValue label="No selection wins" value={result.no_selection_value} /><ResultValue label="Total liability" value={result.total_liability} /><ResultValue label="Matched result" value={result.matched_result} /></dl>{copyFeedback ? <p className="calculator-copy-feedback" role="status">{copyFeedback}</p> : null}</article></FinancialValueReplayGroup></div> : null}
  </div></div>;
}

type EachWayInputs = { mode: "Each Way" | "Extra Place"; stake: string; backOdds: string; term: string; bookmakerPlaces: string; exchangePlaces: string; winLayOdds: string; placeLayOdds: string; winCommission: string; placeCommission: string };
type EachWayResult = { mode: EachWayInputs["mode"]; place_back_odds: string; win_lay_stake: string; place_lay_stake: string; win_liability: string; place_liability: string; qualifying_loss: string; extra_place_profit: string | null; first_place_pnl: string; standard_place_pnl: string; extra_place_pnl: string | null; unplaced_pnl: string; current_value: string };
const eachWayDefaults: EachWayInputs = { mode: "Each Way", stake: "", backOdds: "", term: "5", bookmakerPlaces: "4", exchangePlaces: "4", winLayOdds: "", placeLayOdds: "", winCommission: "0", placeCommission: "0" };
function readEachWay(search: URLSearchParams): EachWayInputs { try { return { ...eachWayDefaults, ...(JSON.parse(search.get("eachWay") ?? "null") ?? {}) }; } catch { return eachWayDefaults; } }
function EachWayCalculator({ onState, search }: { onState: (params: URLSearchParams) => void; search: URLSearchParams }) {
  const [inputs, setInputs] = useState<EachWayInputs>(() => readEachWay(search));
  const [result, setResult] = useState<EachWayResult | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [copyFeedback, setCopyFeedback] = useState("");
  const requestVersion = useRef(0);
  const invalid = !isPositiveAmount(inputs.stake) || Boolean(getSportsbookOddsInputError(inputs.backOdds, { required: true })) || Boolean(getSportsbookOddsInputError(inputs.winLayOdds, { required: true })) || Boolean(getSportsbookOddsInputError(inputs.placeLayOdds, { required: true })) || !/^\d+$/.test(inputs.term) || Number(inputs.term) <= 0 || !/^\d+$/.test(inputs.bookmakerPlaces) || !/^\d+$/.test(inputs.exchangePlaces) || (inputs.mode === "Each Way" ? inputs.bookmakerPlaces !== inputs.exchangePlaces : Number(inputs.bookmakerPlaces) <= Number(inputs.exchangePlaces)) || commissionError(inputs.winCommission) !== null || commissionError(inputs.placeCommission) !== null;
  useEffect(() => { onState(new URLSearchParams({ family: "each-way", eachWay: JSON.stringify(inputs) })); }, [inputs, onState]);
  function update(patch: Partial<EachWayInputs>) { requestVersion.current += 1; setInputs((current) => ({ ...current, ...patch })); setResult(null); setError(""); setCopyFeedback(""); setBusy(false); }
  function switchMode(mode: EachWayInputs["mode"]) { update(mode === "Each Way" ? { mode, exchangePlaces: inputs.bookmakerPlaces } : { mode, bookmakerPlaces: Number(inputs.bookmakerPlaces) > Number(inputs.exchangePlaces) ? inputs.bookmakerPlaces : String(Number(inputs.exchangePlaces || "4") + 1) }); }
  function normalize(field: "backOdds" | "winLayOdds" | "placeLayOdds") { const normalized = normalizeCalculatorOddsInput(inputs[field]); if (normalized.converted) update({ [field]: normalized.canonicalValue }); }
  async function calculate() { if (invalid || busy) return; const version = ++requestVersion.current; setBusy(true); setError(""); try { const response = await fetch(`${apiBaseUrl}/fund-manager/calculators/each-way/preview`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: inputs.mode, each_way_stake: inputs.stake, back_odds: inputs.backOdds, place_term_numerator: "1", place_term_denominator: inputs.term, bookmaker_places: Number(inputs.bookmakerPlaces), exchange_places: Number(inputs.exchangePlaces), win_lay_odds: inputs.winLayOdds, place_lay_odds: inputs.placeLayOdds, win_commission: inputs.winCommission, place_commission: inputs.placeCommission }) }); if (!response.ok) throw new Error(formatApiErrorBody(await response.text(), "Unable to calculate Each Way.")); const next = await response.json() as EachWayResult; if (version === requestVersion.current) setResult(next); } catch (caught) { if (version === requestVersion.current) setError(caught instanceof Error ? caught.message : "Unable to calculate Each Way."); } finally { if (version === requestVersion.current) setBusy(false); } }
  return <div className="calculator-panel-shell"><div className="calculator-shell"><div className="calculator-band calculator-band-primary stack"><h2>Each Way</h2><div className="ledger-calculator-mode-bar"><SelectField id="each-way-mode" label="Mode" onChange={(value) => switchMode(value as EachWayInputs["mode"])} options={[["Each Way", "Each Way"], ["Extra Place", "Extra Place"]]} value={inputs.mode} /></div><div className="form-grid"><section className="calculator-segment calculator-segment-back"><div className="calculator-segment-grid calculator-segment-grid-back"><Field error={null} id="each-way-stake" label="E/W stake per leg" onChange={(value) => update({ stake: value })} value={inputs.stake} /><Field error={getSportsbookOddsInputError(inputs.backOdds, { required: false })} id="each-way-back-odds" label="Back odds" onBlur={() => normalize("backOdds")} onChange={(value) => update({ backOdds: value })} value={inputs.backOdds} /><Field error={null} id="each-way-term" inputMode="numeric" label="Each-way terms (1 /)" onChange={(value) => update({ term: value })} value={inputs.term} /></div></section><section className="calculator-segment calculator-segment-lay"><div className="calculator-segment-grid calculator-segment-grid-back"><Field error={getSportsbookOddsInputError(inputs.winLayOdds, { required: false })} id="each-way-win-lay-odds" label="Win lay odds" onBlur={() => normalize("winLayOdds")} onChange={(value) => update({ winLayOdds: value })} value={inputs.winLayOdds} /><Field error={getSportsbookOddsInputError(inputs.placeLayOdds, { required: false })} id="each-way-place-lay-odds" label="Place lay odds" onBlur={() => normalize("placeLayOdds")} onChange={(value) => update({ placeLayOdds: value })} value={inputs.placeLayOdds} /><Field error={commissionError(inputs.winCommission)} id="each-way-win-commission" label="Win commission" onChange={(value) => update({ winCommission: value })} value={inputs.winCommission} /><Field error={commissionError(inputs.placeCommission)} id="each-way-place-commission" label="Place commission" onChange={(value) => update({ placeCommission: value })} value={inputs.placeCommission} /></div></section></div><div className="form-grid"><Field error={null} id="each-way-bookmaker-places" inputMode="numeric" label="Bookmaker pays" onChange={(value) => update({ bookmakerPlaces: value, ...(inputs.mode === "Each Way" ? { exchangePlaces: value } : {}) })} value={inputs.bookmakerPlaces} /><Field error={null} id="each-way-exchange-places" inputMode="numeric" label="Exchange pays" onChange={(value) => update({ exchangePlaces: value, ...(inputs.mode === "Each Way" ? { bookmakerPlaces: value } : {}) })} value={inputs.exchangePlaces} /></div><div className="table-action-group"><button className="modal-primary-button icon-text-action" disabled={invalid || busy} onClick={() => void calculate()} type="button"><span aria-hidden="true" className={busy ? "button-spinner" : "material-symbols-outlined"}>{busy ? "" : "calculate"}</span><span>{busy ? "Calculating..." : `Calculate ${inputs.mode}`}</span></button></div>{error ? <p className="error-text" role="alert">{error}</p> : null}</div>{result ? <div className="calculator-band calculator-band-secondary"><FinancialValueReplayGroup><article className="calculator-result-card"><div className="calculator-result-card-heading"><strong>{result.mode} reference</strong></div><dl className="calculator-result-card-values"><ResultValue label="Win lay stake" value={result.win_lay_stake} /><ResultValue label="Place lay stake" value={result.place_lay_stake} /><ResultValue label="Win liability" value={result.win_liability} /><ResultValue label="Place liability" value={result.place_liability} /><ResultValue label="First place" value={result.first_place_pnl} /><ResultValue label="Standard place" value={result.standard_place_pnl} />{result.extra_place_pnl ? <ResultValue label="Extra place" value={result.extra_place_pnl} /> : null}<ResultValue label="Unplaced" value={result.unplaced_pnl} /><ResultValue label="Current value" value={result.current_value} /></dl><div className="table-action-group"><button className="review-chip review-chip-copy" onClick={() => void copyCalculatorValue(result.win_lay_stake, setCopyFeedback)} type="button">Copy win stake</button><button className="review-chip review-chip-copy" onClick={() => void copyCalculatorValue(result.place_lay_stake, setCopyFeedback)} type="button">Copy place stake</button></div>{copyFeedback ? <p className="calculator-copy-feedback" role="status">{copyFeedback}</p> : null}</article></FinancialValueReplayGroup></div> : null}</div></div>;
}

async function copyCalculatorValue(value: string, setFeedback: (value: string) => void) {
  try { await navigator.clipboard.writeText(value); setFeedback(`Copied ${value}`); }
  catch { setFeedback("Unable to copy. Select the value and copy it manually."); }
}
function isPositiveAmount(value: string) { return hasCompleteDecimalInputSyntax(value) && Number.isFinite(Number(value)) && Number(value) > 0; }
function commissionError(value: string) { return hasCompleteDecimalInputSyntax(value) && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 1 ? null : "Enter commission as a decimal from 0 to 1, for example 0.02."; }

function Field({ error, id, inputMode = "decimal", label, onBlur, onChange, supportingText, value }: { error: string | null; id: string; inputMode?: "decimal" | "numeric" | "text"; label: string; onBlur?: () => void; onChange: (value: string) => void; supportingText?: string; value: string }) {
  const errorId = `calculator-${id}-error`;
  const dataPdId = id.startsWith("multi-") || id.startsWith("each-way-") ? `calculators.${id}` : `calculators.matched-betting.${id}`;
  return <label className={`field-control${error ? " is-invalid" : ""}`} htmlFor={`calculator-${id}`}><span>{label}</span><input aria-describedby={error ? errorId : undefined} aria-invalid={Boolean(error)} data-pd-id={dataPdId} id={`calculator-${id}`} inputMode={inputMode} onBlur={onBlur} onChange={(event) => onChange(event.target.value)} type="text" value={value} />{error ? <span className="field-validation-text" id={errorId} role="alert">{error}</span> : supportingText ? <span className="field-support-text">{supportingText}</span> : null}</label>;
}
function SelectField({ disabled = false, id, label, onChange, options, value }: { disabled?: boolean; id: string; label: string; onChange: (value: string) => void; options: readonly (readonly [string, string])[]; value: string }) {
  const dataPdId = id.startsWith("multi-") || id.startsWith("each-way-") ? `calculators.${id}` : `calculators.matched-betting.${id}`;
  return <label className="field-control ledger-calculator-mode-field" htmlFor={`calculator-${id}`}><span>{label}</span><select data-pd-id={dataPdId} disabled={disabled} id={`calculator-${id}`} onChange={(event) => onChange(event.target.value)} value={value}>{options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}</select></label>;
}
function ResultValue({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd><FinancialValue label={label} value={value} /></dd></div>; }
