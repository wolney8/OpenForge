"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { apiBaseUrl } from "@/lib/api";
import type { AccountAuthorityRecord } from "@/lib/account-authorities";
import { readLayPlan, type LayPlan } from "@/lib/lay-plan";
import { toDateTimeLocalValue } from "@/lib/date-format";
import { getMoneyInputErrors } from "@/lib/decimal-input";
import { getSportsbookOddsInputError } from "@/lib/sportsbook-odds-input";
import { CommissionInput } from "@/components/commission-input";
import { CalculatorSegmentedControl } from "@/components/calculator-segmented-control";
import { CalculatorSegmentEyebrow } from "@/components/calculator-segment-eyebrow";
import { CalculatorReferenceSection } from "@/components/calculator-reference-section";
import { CalculatorOutcomes } from "@/components/calculator-outcomes";
import { CopyableFinancialValue } from "@/components/copyable-financial-value";
import { SingleLayCustomSlider } from "@/components/single-lay-custom-slider";
import { getPartialLayExecutionSummary } from "@/lib/sportsbook-table-workflow";

type CoreForm = {
  lay_plan_json?: string | null; back_odds: string; lay_odds_1: string;
  back_stake?: string; free_bet_value?: string; exchange_name: string;
  match_strategy: string; lay_actual: string; lay_matched_stake_1: string;
  lay_commission_1: string; status: string; date_settled: string;
};
type Reference = { strategy: LayPlan["selected_strategy"]; lay_stake: string; liability: string;
  back_wins_total: string; back_loses_total: string };
type Preview = { selected_lay_stake: string; strategy_references: Reference[];
  outcomes: { key: string; label: string; bookmaker_component: string; exchange_component: string; promotion_component: string; total: string }[] };

export function CoreLayPlannerUpgrade({onReplan}: {onReplan: () => void}) {
  return <button className="button-link icon-text-action" onClick={onReplan} type="button"
    title="Explicitly replan this unplaced row using current references. Existing actual history is never upgraded automatically.">
    <span aria-hidden="true" className="material-symbols-outlined">calculate</span><span>Replan with current references</span>
  </button>;
}

function PlannerField({id, label, value, onChange, error, readOnly}: {
  id: string; label: string; value: string; onChange: (value: string) => void;
  error?: string | null; readOnly?: boolean;
}) {
  return <label className="field-control" htmlFor={id}><span>{label}</span>
    <input aria-label={label} aria-describedby={error ? `${id}.error` : undefined} aria-invalid={Boolean(error)}
      id={id} inputMode="decimal" onChange={event => onChange(event.target.value)} readOnly={readOnly} value={value} />
    {error ? <span className="field-validation-text" id={`${id}.error`} role="alert">{error}</span> : null}</label>;
}

/** Shared reference UI; the API reference service is the only financial engine. */
export function CoreLayPlanner({ accounts, basis, defaultCommission, exchangeCommissions, actualLiability, form, inspectionId,
  onPatch, onValidity, readOnly = false }: {
  accounts: AccountAuthorityRecord[]; basis: "Normal" | "SNR"; defaultCommission: string;
  exchangeCommissions: { exchange_name: string; commission_rate: string }[];
  actualLiability?: string | null;
  form: CoreForm; inspectionId: string; onPatch: (patch: Partial<CoreForm>) => void;
  onValidity: (valid: boolean) => void; readOnly?: boolean;
}) {
  const savedPlan = useMemo(() => readLayPlan(form.lay_plan_json), [form.lay_plan_json]);
  const [mode, setMode] = useState<"Simple" | "Advanced">(savedPlan && savedPlan.selected_strategy !== "Standard" ? "Advanced" : "Simple");
  const [commission, setCommission] = useState(savedPlan?.commission ?? defaultCommission);
  const [origin, setOrigin] = useState<LayPlan["commission_origin"]>(savedPlan?.commission_origin ?? "default");
  const [planningOdds, setPlanningOdds] = useState(savedPlan?.lay_odds ?? form.lay_odds_1);
  const [exchangeId, setExchangeId] = useState(savedPlan?.exchange_account_id ?? "");
  const [customDraft, setCustomDraft] = useState(savedPlan?.custom_lay_stake ?? "");
  const [minimumText, setMinimumText] = useState("");
  const [maximumText, setMaximumText] = useState("");
  const [actualDraft, setActualDraft] = useState("");
  const [actualOdds, setActualOdds] = useState(savedPlan?.lay_odds ?? form.lay_odds_1);
  const [actualCommission, setActualCommission] = useState(savedPlan?.commission ?? defaultCommission);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const requestVersion = useRef(0);
  const callbacks = useRef({ onPatch, onValidity });
  useEffect(() => { callbacks.current = { onPatch, onValidity }; }, [onPatch, onValidity]);
  const planRef = useRef(savedPlan);
  useEffect(() => { planRef.current = savedPlan; }, [savedPlan]); // revision acknowledgement only
  const hasActual = Boolean((form.lay_actual && Number(form.lay_actual) > 0) || (form.lay_matched_stake_1 && Number(form.lay_matched_stake_1) > 0));
  const hasRecordedBack = form.status === "Placed" || form.status === "Settled";
  const stake = basis === "SNR" ? form.free_bet_value ?? "" : form.back_stake ?? "";
  const exchanges = accounts.filter(a => a.type === "Exchange" && a.status !== "Archived" && a.lifecycle_status !== "Archived");
  const exchange = exchanges.find(a => a.account_id === exchangeId) ?? exchanges.find(a => a.account === form.exchange_name);
  const strategy = (["Standard", "Underlay", "Overlay", "Custom"].includes(form.match_strategy) ? form.match_strategy : "Standard") as LayPlan["selected_strategy"];
  const requestKey = JSON.stringify({ stake, backOdds: form.back_odds, planningOdds, commission,
    strategy, customDraft, exchangeId: exchange?.account_id ?? "", basis, origin });
  const draftErrors: Record<string, string | null> = {
    ...getMoneyInputErrors({ stake, customDraft }, ["stake", "customDraft"]),
    backOdds: getSportsbookOddsInputError(form.back_odds, { required: true }),
    layOdds: getSportsbookOddsInputError(planningOdds, { required: true }),
  };
  const validInputs = Boolean(stake && Number(stake) > 0 && exchange && commission !== "" &&
    /^\d*(?:\.\d+)?$/.test(commission) && Number(commission) >= 0 && Number(commission) <= 1 &&
    !Object.values(draftErrors).some(Boolean) && (strategy !== "Custom" || customDraft !== ""));
  const reviewedInputsUnchanged = Boolean(savedPlan && validInputs &&
    savedPlan.backing_basis === basis && savedPlan.selected_strategy === strategy &&
    savedPlan.commission_origin === origin && savedPlan.exchange_account_id === exchange?.account_id &&
    Number(savedPlan.back_stake) === Number(stake) && Number(savedPlan.back_odds) === Number(form.back_odds) &&
    Number(savedPlan.lay_odds) === Number(planningOdds) && Number(savedPlan.commission) === Number(commission) &&
    (strategy !== "Custom" || Number(savedPlan.custom_lay_stake) === Number(customDraft)));

  useEffect(() => {
    const version = ++requestVersion.current;
    const controller = new AbortController();
    // Reopening an unchanged, server-reviewed plan must not prevent an actual settlement
    // while its reference display refreshes. Any edited planning input invalidates saving.
    callbacks.current.onValidity(reviewedInputsUnchanged);
    if (!validInputs || (form.lay_plan_json && !savedPlan)) {
      const timer = window.setTimeout(() => {
        setBusy(false);
        setError(form.lay_plan_json && !savedPlan ? "Unsupported planning version. Existing actual history is preserved; review this plan before editing." : "Complete valid stake, odds, Exchange and Commission (%) to calculate and save the plan.");
      }, 0);
      return () => {window.clearTimeout(timer); controller.abort();};
    }
    // Bounded coalescing while dragging; calculations occur during interaction, not only on release.
    const timer = window.setTimeout(async () => {
      setBusy(true); setError("");
      try {
        const response = await fetch(`${apiBaseUrl}/fund-manager/calculators/matched-betting/preview`, {
          method: "POST", credentials: "include", signal: controller.signal,
          headers: { "Content-Type":"application/json" }, body: JSON.stringify({
            bet_type: basis === "SNR" ? "free_bet" : "qualifying", free_bet_mode:"SNR",
            back_stake: stake, back_odds: form.back_odds, lay_odds: planningOdds,
            exchange_commission: commission, strategy, manual_lay_stake: strategy === "Custom" ? customDraft : "",
            show_custom_reference:true, custom_reference_lay_stake:customDraft,
          }),
        });
        if (!response.ok) throw new Error(await response.text());
        const result = await response.json() as Preview;
        if (version !== requestVersion.current || controller.signal.aborted) return;
        const previous = planRef.current;
        const plan: LayPlan = {
          schema_version:"lay-plan-v1", revision:previous?.revision ?? 0,
          calculation_contract_version:basis === "SNR" ? "snr-outcome-target-v1" : "workbook-reference-v1",
          backing_basis:basis, back_stake:stake, back_odds:form.back_odds, lay_odds:planningOdds,
          selected_strategy:strategy, custom_lay_stake:strategy === "Custom" ? customDraft : "",
          exchange_name:exchange!.account, exchange_account_id:exchange!.account_id,
          commission_units:"ratio", commission, commission_origin:origin,
          reviewed_planned_lay_stake:result.selected_lay_stake,
          source_identity:previous?.source_identity ?? "", source_checksum:previous?.source_checksum ?? "",
        };
        setPreview(result); setBusy(false);
        callbacks.current.onPatch({ lay_plan_json:JSON.stringify(plan) });
        callbacks.current.onValidity(true);
      } catch (failure) {
        if (version !== requestVersion.current || controller.signal.aborted) return;
        setBusy(false); setError(String(failure)); callbacks.current.onValidity(false);
      }
    }, 90);
    return () => { window.clearTimeout(timer); controller.abort(); };
    // The request key owns financial inputs; callbacks and revision metadata are read through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, validInputs]);

  function invalidate() { requestVersion.current += 1; setBusy(true); callbacks.current.onValidity(false); }
  function patch(values: Partial<CoreForm>) {
    if (Object.entries(values).every(([key,value]) => form[key as keyof CoreForm] === value)) return;
    invalidate(); onPatch(values);
  }
  function selectStrategy(value: LayPlan["selected_strategy"]) { patch({ match_strategy:value }); }
  function editCustom(value: string) {
    if (value === customDraft && strategy === "Custom") return;
    invalidate(); setCustomDraft(value); onPatch({ match_strategy:"Custom" });
  }
  const references = preview?.strategy_references ?? [];
  const custom = references.find(r => r.strategy === "Custom");
  const standard = references.find(r => r.strategy === "Standard");
  const lower = references.find(r => r.strategy === "Underlay");
  const upper = references.find(r => r.strategy === "Overlay");
  const minimum = minimumText === "" ? Number(lower?.lay_stake ?? "0") : Number(minimumText);
  const maximum = maximumText === "" ? Number(upper?.lay_stake ?? standard?.lay_stake ?? "0") : Number(maximumText);
  const disabled = busy || !validInputs || Boolean(error) || readOnly;
  const recordedStake = form.lay_actual || form.lay_matched_stake_1;
  const actualTermsMatchPlan = Boolean(savedPlan && recordedStake &&
    Number(form.lay_odds_1) === Number(savedPlan.lay_odds) &&
    Number(form.lay_commission_1) === Number(savedPlan.commission));
  const partialSummary = getPartialLayExecutionSummary({
    explicitTargetLayStake: savedPlan?.reviewed_planned_lay_stake ?? "",
    suggestedTargetLayStake: "",
    legs: recordedStake ? [{matchedStake:recordedStake}] : [],
  });
  const rowsFor = (r: Reference) => [
    { label:"Lay stake", value:r.lay_stake, copyable:true }, { label:"Liability", value:r.liability },
    { label:"Bookmaker wins", value:r.back_wins_total }, { label:"Exchange wins", value:r.back_loses_total },
  ];
  const actualValid = actualDraft !== "" && Number(actualDraft) > 0 &&
    !Object.keys(getMoneyInputErrors({ actualDraft }, ["actualDraft"])).length &&
    !getSportsbookOddsInputError(actualOdds || planningOdds, {required:true}) && actualCommission !== "" &&
    /^\d*(?:\.\d+)?$/.test(actualCommission) && Number(actualCommission) >= 0 && Number(actualCommission) <= 1;
  return <div className="calculator-shell" data-pd-id={inspectionId}>
    <div className="calculator-band calculator-band-primary">
      <div className="ledger-calculator-mode-bar">
        <label className="field-control ledger-calculator-mode-field"><span>Bet Type</span><input readOnly value={basis === "SNR" ? "Free Bet SNR" : "Normal"} /></label>
        <div className="field-control ledger-calculator-mode-field"><span>Presentation Mode</span><CalculatorSegmentedControl ariaLabel={`${basis} calculator presentation mode`}
          onChange={next => { setMode(next); if (next === "Simple" && strategy !== "Standard") selectStrategy("Standard"); }}
          options={[{label:"Simple",value:"Simple"},{label:"Advanced",value:"Advanced"}]} value={mode} /></div>
      </div>
      <div className="form-grid calculator-paired-segments calculator-paired-rows-2" data-pd-id={`${inspectionId}.paired-segments`}>
        <section className="calculator-segment calculator-segment-back calculator-paired-segment" style={{"--calculator-segment-field-rows":2,"--calculator-segment-span":3} as CSSProperties}>
          <CalculatorSegmentEyebrow>Back bet</CalculatorSegmentEyebrow><div className="calculator-segment-grid calculator-paired-segment-fields">
            <PlannerField id={`${inspectionId}.stake`} label={basis === "SNR" ? "Free bet value" : "Back stake"} value={stake} onChange={value => patch(basis === "SNR" ? {free_bet_value:value} : {back_stake:value})} error={draftErrors.stake} readOnly={hasActual || hasRecordedBack || readOnly} />
            <PlannerField id={`${inspectionId}.back-odds`} label="Back odds" value={form.back_odds} onChange={value => patch({back_odds:value})} error={draftErrors.backOdds} readOnly={hasActual || hasRecordedBack || readOnly} />
          </div></section>
        <section className="calculator-segment calculator-segment-lay calculator-paired-segment" style={{"--calculator-segment-field-rows":2,"--calculator-segment-span":4} as CSSProperties}>
          <CalculatorSegmentEyebrow>Lay bet</CalculatorSegmentEyebrow><div className="calculator-segment-grid calculator-paired-segment-fields">
            <PlannerField id={`${inspectionId}.lay-odds`} label="Lay odds" value={planningOdds} onChange={value => { invalidate(); setPlanningOdds(value); if (!hasActual) onPatch({lay_odds_1:value}); }} error={draftErrors.layOdds} readOnly={readOnly} />
          </div><div className="calculator-segment-grid calculator-segment-auxiliary-fields">
            <label className="field-control"><span>Exchange</span><select disabled={hasActual || readOnly} onChange={event => { const a = exchanges.find(a => a.account_id === event.target.value); if (!a) return;
              const rate = exchangeCommissions.find(row => row.exchange_name === a.account)?.commission_rate ?? "";
              if (a.account_id === exchange?.account_id && (origin === "override" || rate === commission)) return;
              invalidate(); setExchangeId(a.account_id); onPatch({exchange_name:a.account});
              if (origin === "default") { setCommission(rate); if (!hasActual) setActualCommission(rate); } }} value={exchange?.account_id ?? ""}>
              <option value="">Select Exchange</option>{exchanges.map(a => <option key={a.account_id} value={a.account_id}>{a.account}</option>)}</select></label>
            <label className="field-control"><span>Exchange commission (%)</span><CommissionInput aria-label="Planning exchange commission (%)" onRatioChange={value => { if (value === commission && origin === "override") return; invalidate(); setCommission(value); if (!hasActual) setActualCommission(value); setOrigin("override"); }} readOnly={readOnly} value={commission} /></label>
          </div></section>
      </div>
      {busy ? <p role="status">Updating reference…</p> : null}{error ? <p className="error-text" role="alert">{error}</p> : null}
    </div>
    <div className="calculator-band calculator-band-secondary" aria-busy={busy}>
      {mode === "Advanced" ? <section className="calculator-advanced-reference-group" data-pd-id={`${inspectionId}.advanced`}>
        <div className="calculator-reference-card-grid">{(["Underlay","Standard","Overlay"] as const).map(name => { const r = references.find(r => r.strategy === name); return <CalculatorReferenceSection key={name}
          busy={disabled} description={r ? name === "Underlay" ? "Underlay favours the bookmaker-win side." : name === "Overlay" ? "Overlay favours the exchange-win side." : "Standard aims to equalise the outcomes." : "No valid non-negative endpoint exists for these inputs."}
          inspectionId={`${inspectionId}.${name.toLowerCase()}`} title={name} rows={r ? rowsFor(r) : []}
          tone={name === "Underlay" ? "underlay" : name === "Overlay" ? "overlay" : "standard"} />; })}</div>
        <section className="calculator-custom-reference-group" data-pd-id={`${inspectionId}.custom-group`}><CalculatorReferenceSection busy={disabled} description="Custom lets you choose your own planned lay stake."
          inspectionId={`${inspectionId}.custom`} title="Custom" rows={custom ? rowsFor(custom).filter(row => row.label !== "Lay stake") : []} tone="custom"
          action={<div className="calculator-custom-input-row"><PlannerField id={`${inspectionId}.custom-lay`} label="Lay stake" value={customDraft || custom?.lay_stake || ""} onChange={editCustom} error={draftErrors.customDraft} readOnly={readOnly} /><CopyableFinancialValue dataPdId={`${inspectionId}.custom-input-copy`} disabled={disabled || !custom} label="Custom lay stake" value={customDraft || custom?.lay_stake} /></div>} />
        {Number.isFinite(minimum) && Number.isFinite(maximum) && maximum > minimum ? <SingleLayCustomSlider
          current={Math.min(maximum,Math.max(minimum,Number(customDraft || custom?.lay_stake || standard?.lay_stake || minimum)))}
          centre={Number(standard?.lay_stake)} minimum={minimum} maximum={maximum} minimumText={minimumText || String(minimum)} maximumText={maximumText || String(maximum)}
          onDraft={editCustom} onCommit={editCustom} onMinimumChange={setMinimumText} onMaximumChange={setMaximumText} /> : <p className="field-hint">Enter valid minimum and maximum bounds to use the slider.</p>}</section>
      </section> : null}
      {mode === "Simple" ? <CalculatorReferenceSection busy={disabled} description="Standard aims to equalise the outcomes."
        inspectionId={`${inspectionId}.selected-reference`} title="Standard" rows={standard ? rowsFor(standard) : []}
        action={undefined} /> : null}
      <CalculatorOutcomes busy={disabled} inspectionId={`${inspectionId}.outcomes`} columns={["Bookmaker","Exchange","Bonus / cashback"]}
        rows={(preview?.outcomes ?? []).map((o,index) => ({key:o.key,label:o.label,tone:index === 0 ? "positive" : "exchange",copyableTotal:true,
          components:[[o.bookmaker_component],[o.exchange_component],[o.promotion_component]],total:o.total}))} />
      <section className="calculator-result-card stack" data-pd-id={`${inspectionId}.actual-placement`}>
        <div className="calculator-result-card-heading"><h3>Actual placement</h3></div>
        {hasActual ? <><p>Recorded matched stake <CopyableFinancialValue label="Actual matched stake" value={recordedStake} /> at {form.lay_odds_1}. Planning edits do not change these actuals.</p>
          <p>Actual liability <CopyableFinancialValue label="Actual liability" value={actualLiability} /></p>
          {partialSummary.targetLayStake !== null ? <div className="summary-list" data-pd-id={`${inspectionId}.partial-summary`}>
            <p className="lede"><span className="summary-label">Reviewed planned stake</span><CopyableFinancialValue label="Reviewed planned stake" value={partialSummary.targetLayStake.toFixed(2)} /></p>
            <p className="lede"><span className="summary-label">Matched so far</span><CopyableFinancialValue label="Matched so far" value={partialSummary.matchedTotal.toFixed(2)} /></p>
            <p className="lede"><span className="summary-label">Known unmatched order</span><strong>Not recorded</strong></p>
            {actualTermsMatchPlan && partialSummary.remainingToMatch !== null && partialSummary.remainingToMatch > 0 ? <p className="lede"><span className="summary-label">Remaining to match at the same odds</span><CopyableFinancialValue label="Remaining to match at the same odds" value={partialSummary.remainingToMatch.toFixed(2)} /></p> : null}
          </div> : null}
          <p className="field-hint">{actualTermsMatchPlan
            ? "The remaining amount is a planning reference only. Copying it does not record another fill."
            : "The actual odds or commission differ from the plan. An additional hedge needs a reviewed changed-odds calculation; no unmatched order is assumed filled."}</p></> : <>
          <div className="form-grid"><PlannerField id={`${inspectionId}.actual-stake`} label="Actual matched stake" value={actualDraft} onChange={setActualDraft} readOnly={readOnly} /><PlannerField id={`${inspectionId}.actual-odds`} label="Actual lay odds" value={actualOdds || planningOdds} onChange={setActualOdds} readOnly={readOnly} />
            <label className="field-control"><span>Actual exchange commission (%)</span><CommissionInput aria-label="Actual exchange commission (%)" onRatioChange={setActualCommission} readOnly={readOnly} value={actualCommission} /></label></div>
          <button className="button-link icon-text-action" disabled={disabled || !actualValid} onClick={() => onPatch({lay_actual:actualDraft,lay_matched_stake_1:actualDraft,
            lay_odds_1:actualOdds || planningOdds,lay_commission_1:actualCommission,status:"Placed",
            date_settled:form.date_settled || toDateTimeLocalValue(new Date().toISOString())})} type="button"><span aria-hidden="true" className="material-symbols-outlined">check</span><span>Confirm actual placement</span></button>
        </>}
      </section>
    </div>
  </div>;
}
