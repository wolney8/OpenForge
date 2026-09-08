"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { FinancialValue, FinancialValueReplayGroup } from "@/components/financial-value";
import {
  EachWayBackBetSection,
  EachWayLaySection,
  EachWayModeToggle,
  EachWayOutcomeMatrix,
  EachWayPlaceTermsSection,
  EachWayStakeSummary,
  EachWayTermField,
  type EachWayOutcomeRow,
} from "@/components/each-way-calculator-presentation";
import { QuickSelectRail } from "@/components/quick-select-rail";
import { SingleLayCustomSlider } from "@/components/single-lay-custom-slider";
import { apiBaseUrl } from "@/lib/api";
import { formatApiErrorBody } from "@/lib/api-error";
import { hasCompleteDecimalInputSyntax, getSportsbookOddsInputError, normalizeCalculatorOddsInput } from "@/lib/sportsbook-odds-input";

type BetType = "qualifying" | "free_bet" | "bonus_lock_in" | "cashback" | "profit_boost";
type Strategy = "Standard" | "Underlay" | "Overlay" | "Custom" | "Partial Lay";
type ProfitBoostMode = "displayed_odds" | "total_return" | "profit_only" | "percentage";
type Family = "matched-betting" | "multi-lay" | "each-way" | "sequential-lay" | "early-payout" | "multiples" | "dutching" | "odds-converter" | "blackjack";
type Inputs = {
  betType: BetType; freeBetMode: "SNR" | "SR"; promotionMode: "standard" | "cashback";
  strategy: Strategy; backStake: string; backOdds: string; layOdds: string;
  exchange: string; exchangeCommission: string; manualLayStake: string; promotionValue: string;
  customMinimum: string; customMaximum: string;
  bonusTrigger: "Lay Wins" | "Back Wins";
  retentionPercent: string; underlayFactor: string; overlayFactor: string;
  profitBoostMode: ProfitBoostMode; boostedBackOdds: string; totalPotentialReturn: string;
  potentialProfit: string; baseBackOdds: string; profitBoostPercent: string;
  actualAcceptedBackOdds: string; maximumBoostWinnings: string;
};
type Outcome = { key: string; label: string; bookmaker_component: string; exchange_component: string; promotion_component: string | null; total: string };
type ExchangeOption = { catalogue_id: string; name: string; default_commission_rate: string };
type Result = {
  result_kind: "reference"; calculation_state: string; calculator_family: "matched-betting";
  canonical_back_odds: string; canonical_lay_odds: string; selected_lay_stake: string;
  reference_lay_stake_standard: string; reference_lay_stake_underlay: string;
  reference_lay_stake_overlay: string; liability: string; pnl_if_back_wins: string;
  pnl_if_lay_wins: string; matched_result: string;
  promotion_trigger_result: string | null;
  effective_back_odds: string; profit_boost_source: string | null; outcomes: Outcome[];
};

const defaults: Inputs = {
  betType: "qualifying", freeBetMode: "SNR", promotionMode: "standard", strategy: "Standard",
  backStake: "", backOdds: "", layOdds: "", exchange: "Smarkets", exchangeCommission: "0", manualLayStake: "",
  promotionValue: "", customMinimum: "", customMaximum: "", bonusTrigger: "Lay Wins", retentionPercent: "70", underlayFactor: "0.928", overlayFactor: "1.300",
  profitBoostMode: "displayed_odds", boostedBackOdds: "", totalPotentialReturn: "", potentialProfit: "",
  baseBackOdds: "", profitBoostPercent: "", actualAcceptedBackOdds: "", maximumBoostWinnings: "",
};
const families: Array<{ label: string; value: Family }> = [
  { value: "matched-betting", label: "Standard" },
  { value: "multi-lay", label: "Multi-Lay" },
  { value: "each-way", label: "Each Way" },
  { value: "sequential-lay", label: "Sequential Lay" },
  { value: "early-payout", label: "Early Payout / 2UP" },
  { value: "multiples", label: "Multiples / Accumulator" },
  { value: "dutching", label: "Dutching" },
  { value: "odds-converter", label: "Odds / Probability" },
  { value: "blackjack", label: "Blackjack Strategy" },
];

function CalculatorFamilySelector({
  onSelect,
  selected,
}: {
  onSelect: (family: Family) => void;
  selected: Family;
}) {
  const pageSize = 3;
  const selectedIndex = Math.max(0, families.findIndex((item) => item.value === selected));
  const selectedPage = Math.floor(selectedIndex / pageSize);
  const pageCount = Math.ceil(families.length / pageSize);
  const hasPages = families.length > pageSize;
  const [navigation, setNavigation] = useState({ page: selectedPage, selected });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const page = navigation.selected === selected ? navigation.page : selectedPage;
  const visibleFamilies = families.slice(page * pageSize, page * pageSize + pageSize);
  const hiddenCount = families.length - visibleFamilies.length;

  useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = (event: MouseEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  function choose(next: Family) {
    onSelect(next);
    setNavigation({
      page: Math.floor(families.findIndex((item) => item.value === next) / pageSize),
      selected: next,
    });
    setMenuOpen(false);
  }

  return <nav aria-label="Calculator families" className={`calculator-family-selector${hasPages ? "" : " is-static"}`} data-pd-id="calculators.family-selector">
    {hasPages ? <button aria-label="Show previous calculator families" className="icon-button compact-action calculator-family-page-action" disabled={page === 0} onClick={() => setNavigation({ page: Math.max(0, page - 1), selected })} type="button"><span aria-hidden="true" className="material-symbols-outlined">chevron_left</span></button> : null}
    <div className="calculator-family-page" data-pd-id="calculators.family-page">
      {visibleFamilies.map((item) => <button aria-current={item.value === selected ? "page" : undefined} aria-pressed={item.value === selected} className={`review-chip${item.value === selected ? " is-active" : ""}`} key={item.value} onClick={() => choose(item.value)} type="button">{item.label}</button>)}
    </div>
    {hasPages ? <button aria-label="Show next calculator families" className="icon-button compact-action calculator-family-page-action" disabled={page === pageCount - 1} onClick={() => setNavigation({ page: Math.min(pageCount - 1, page + 1), selected })} type="button"><span aria-hidden="true" className="material-symbols-outlined">chevron_right</span></button> : null}
    {hasPages ? <div className="app-menu-shell calculator-family-more-shell" ref={menuRef}>
      <button aria-controls="calculator-family-menu" aria-expanded={menuOpen} aria-haspopup="menu" aria-label={`Show all calculators, ${hiddenCount} outside this page`} className="review-chip calculator-family-more-action" onClick={() => setMenuOpen((current) => !current)} type="button">+{hiddenCount}</button>
      <div className={`app-menu-panel app-menu-panel-right calculator-family-menu${menuOpen ? " is-open" : ""}`} id="calculator-family-menu" role="menu">
        {families.map((item) => <button aria-current={item.value === selected ? "page" : undefined} className={`nav-pill${item.value === selected ? " is-active" : ""}`} key={item.value} onClick={() => choose(item.value)} role="menuitem" type="button">{item.label}</button>)}
      </div>
    </div> : null}
  </nav>;
}

function CalculatorFamilyHeading({ onOpen, title }: { onOpen: () => void; title: string }) {
  return <div className="calculator-panel-heading" data-pd-id="calculators.active-header">
    <div className="calculator-panel-heading-row">
      <h2>{title}</h2>
      <div className="tracker-nav" data-pd-id="calculators.header-actions">
        <span className="table-chip table-chip-info" data-pd-id="calculators.reference-status">Reference only</span>
        <button className="button-link icon-text-action" data-pd-id="calculators.open-new-tab" onClick={onOpen} type="button"><span aria-hidden="true" className="material-symbols-outlined">open_in_new</span><span>Open in new tab</span></button>
      </div>
    </div>
  </div>;
}

function readInitial(search: URLSearchParams): Inputs {
  const next = { ...defaults };
  for (const key of Object.keys(next) as (keyof Inputs)[]) {
    const value = search.get(key);
    if (value !== null) (next as Record<string, string>)[key] = value;
  }
  if (next.betType === ("money_back" as BetType)) next.betType = "bonus_lock_in";
  if (!["qualifying", "free_bet", "bonus_lock_in", "cashback", "profit_boost"].includes(next.betType)) next.betType = "qualifying";
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
  const [exchanges, setExchanges] = useState<ExchangeOption[]>([]);
  const commissionWasEdited = useRef(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [customReference, setCustomReference] = useState("");
  const requestVersionRef = useRef(0);
  const requestAbortRef = useRef<AbortController | null>(null);
  const errors = useMemo(() => validate(inputs), [inputs]);
  const invalid = Object.values(errors).some(Boolean);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${apiBaseUrl}/fund-manager/calculators/exchanges`, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load exchanges.");
        const options = await response.json() as ExchangeOption[];
        setExchanges(options);
        const smarkets = options.find((option) => option.name === "Smarkets");
        if (smarkets && !commissionWasEdited.current) {
          setInputs((current) => ({ ...current, exchange: smarkets.name, exchangeCommission: smarkets.default_commission_rate }));
        }
      })
      .catch((caught) => { if (!(caught instanceof DOMException && caught.name === "AbortError")) setError("Unable to load canonical exchange defaults."); });
    return () => controller.abort();
  }, []);

  function update<K extends keyof Inputs>(field: K, value: Inputs[K]) {
    requestAbortRef.current?.abort(); requestAbortRef.current = null; requestVersionRef.current += 1;
    setInputs((current) => ({ ...current, [field]: value }));
    setTouched((current) => ({ ...current, [field]: true }));
    setResult(null); setError(""); setCopyFeedback(""); setConversion(""); setIsCalculating(false);
  }

  function updatePatch(patch: Partial<Inputs>) {
    requestAbortRef.current?.abort(); requestAbortRef.current = null; requestVersionRef.current += 1;
    setInputs((current) => ({ ...current, ...patch }));
    setResult(null); setError(""); setCopyFeedback(""); setConversion(""); setIsCalculating(false);
  }

  function normalizeOdds(field: "backOdds" | "layOdds") {
    const normalized = normalizeCalculatorOddsInput(inputs[field]);
    if (normalized.converted) {
      setInputs((current) => ({ ...current, [field]: normalized.canonicalValue }));
      setConversion(`${field === "backOdds" ? "Back" : "Lay"} odds converted to decimal ${normalized.canonicalValue}.`);
    }
  }

  function normalizeDerivedOdds(field: "boostedBackOdds" | "baseBackOdds" | "actualAcceptedBackOdds") {
    const normalized = normalizeCalculatorOddsInput(inputs[field]);
    if (normalized.converted) {
      setInputs((current) => ({ ...current, [field]: normalized.canonicalValue }));
      setConversion(`Odds converted to decimal ${normalized.canonicalValue}.`);
    }
  }

  async function calculate() {
    if (invalid) return;
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
          bonus_trigger: inputs.bonusTrigger,
          retention_percent: inputs.retentionPercent, underlay_factor: inputs.underlayFactor,
          overlay_factor: inputs.overlayFactor,
          profit_boost_mode: inputs.profitBoostMode, boosted_back_odds: inputs.boostedBackOdds,
          total_potential_return: inputs.totalPotentialReturn, potential_profit: inputs.potentialProfit,
          base_back_odds: inputs.baseBackOdds, profit_boost_percent: inputs.profitBoostPercent,
          actual_accepted_back_odds: inputs.actualAcceptedBackOdds,
          maximum_boost_winnings: inputs.maximumBoostWinnings,
        }),
      });
      if (!response.ok) throw new Error(formatApiErrorBody(await response.text(), "Unable to calculate."));
      const next = (await response.json()) as Result;
      if (version === requestVersionRef.current) { setResult(next); setCustomReference(next.reference_lay_stake_standard); }
    } catch (caught) {
      if (version === requestVersionRef.current && !(caught instanceof DOMException && caught.name === "AbortError")) {
        setResult(null); setError(caught instanceof Error ? caught.message : "Unable to calculate.");
      }
    } finally { if (version === requestVersionRef.current) { requestAbortRef.current = null; setIsCalculating(false); } }
  }

  useEffect(() => () => requestAbortRef.current?.abort(), []);
  const matchedInputKey = JSON.stringify(inputs);
  useEffect(() => {
    if (invalid || family !== "matched-betting") {
      requestAbortRef.current?.abort();
      return;
    }
    const timer = window.setTimeout(() => { void calculate(); }, 120);
    return () => window.clearTimeout(timer);
    // The serialized key deliberately controls request identity and avoids unchanged refetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedInputKey, invalid, family]);
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

  const showPromotion = inputs.betType === "bonus_lock_in" || inputs.betType === "cashback";
  const showManualLay = inputs.strategy === "Partial Lay";
  const activeFamilyLabel = families.find((item) => item.value === family)?.label ?? "Calculator";
  return <section aria-labelledby="calculator-workspace-title" className="content-panel stack sportsbook-page-shell" data-pd-id="calculators.workspace">
    <div className="workflow-panel-header"><div><span className="eyebrow">Fund Manager</span><h1 id="calculator-workspace-title">Calculators</h1></div></div>
    <CalculatorFamilySelector onSelect={(next) => { popoutStateRef.current = new URLSearchParams({ family: next }); setFamily(next); }} selected={family} />
    <CalculatorFamilyHeading onOpen={openInNewTab} title={activeFamilyLabel} />
    {family === "matched-betting" ? <div className="calculator-panel-shell"><div className="calculator-shell">
      <div className="calculator-band calculator-band-primary">
        <div className="ledger-calculator-mode-bar">
          <SelectField id="bet-type" label="Bet type" value={inputs.betType} onChange={(value) => update("betType", value as BetType)} options={[["qualifying", "Qualifying Bet"], ["free_bet", "Free Bet"], ["bonus_lock_in", "Bonus Lock-In"], ["cashback", "Cashback"], ["profit_boost", "Profit Boost"]]} />
          <SelectField id="strategy" label="Strategy" value={inputs.strategy} onChange={(value) => update("strategy", value as Strategy)} options={[["Standard", "Standard"], ["Underlay", "Underlay"], ["Overlay", "Overlay"], ["Custom", "Custom"], ["Partial Lay", "Part Lay"]]} />
          {inputs.betType === "free_bet" ? <SelectField id="free-bet-mode" label="Free bet" value={inputs.freeBetMode} onChange={(value) => update("freeBetMode", value as "SNR" | "SR")} options={[["SNR", "Stake Not Returned"], ["SR", "Stake Returned"]]} /> : null}
          {showPromotion ? <SelectField id="bonus-trigger" label="Award trigger" value={inputs.bonusTrigger} onChange={(value) => update("bonusTrigger", value as Inputs["bonusTrigger"])} options={[["Lay Wins", "Back bet loses"], ["Back Wins", "Back bet wins"]]} /> : null}
          {inputs.betType === "profit_boost" ? <SelectField id="profit-boost-mode" label="Boosted price source" value={inputs.profitBoostMode} onChange={(value) => update("profitBoostMode", value as ProfitBoostMode)} options={[["displayed_odds", "Displayed boosted odds"], ["total_return", "Total potential return"], ["profit_only", "Potential profit / winnings"], ["percentage", "Base odds + boost %"]]} /> : null}
        </div>
        <div className="form-grid">
          <section className="calculator-segment calculator-segment-back"><div className="calculator-segment-heading"><span className="eyebrow">Back bet</span></div><div className="calculator-segment-grid calculator-segment-grid-back">
            <Field error={touched.backStake ? errors.backStake : null} id="back-stake" label={inputs.betType === "free_bet" ? "Free bet value" : "Back stake"} onChange={(value) => update("backStake", value)} value={inputs.backStake} />
            {inputs.betType !== "profit_boost" ? <Field error={touched.backOdds ? errors.backOdds : null} id="back-odds" label="Back odds" onBlur={() => normalizeOdds("backOdds")} onChange={(value) => update("backOdds", value)} value={inputs.backOdds} /> : null}
            {inputs.betType === "profit_boost" && inputs.profitBoostMode === "displayed_odds" ? <Field error={touched.boostedBackOdds ? errors.boostedBackOdds : null} id="boosted-back-odds" label="Boosted odds displayed" onBlur={() => normalizeDerivedOdds("boostedBackOdds")} onChange={(value) => update("boostedBackOdds", value)} value={inputs.boostedBackOdds} /> : null}
            {inputs.betType === "profit_boost" && inputs.profitBoostMode === "total_return" ? <Field error={touched.totalPotentialReturn ? errors.totalPotentialReturn : null} id="total-potential-return" label="Total potential return" onChange={(value) => update("totalPotentialReturn", value)} supportingText="Includes the returned cash stake." value={inputs.totalPotentialReturn} /> : null}
            {inputs.betType === "profit_boost" && inputs.profitBoostMode === "profit_only" ? <Field error={touched.potentialProfit ? errors.potentialProfit : null} id="potential-profit" label="Potential profit / winnings" onChange={(value) => update("potentialProfit", value)} supportingText="Excludes the returned cash stake." value={inputs.potentialProfit} /> : null}
            {inputs.betType === "profit_boost" && inputs.profitBoostMode === "percentage" ? <><Field error={touched.baseBackOdds ? errors.baseBackOdds : null} id="base-back-odds" label="Original / base odds" onBlur={() => normalizeDerivedOdds("baseBackOdds")} onChange={(value) => update("baseBackOdds", value)} value={inputs.baseBackOdds} /><Field error={touched.profitBoostPercent ? errors.profitBoostPercent : null} id="profit-boost-percent" label="Profit Boost (%)" onChange={(value) => update("profitBoostPercent", value)} value={inputs.profitBoostPercent} /></> : null}
            {inputs.betType === "profit_boost" ? <Field error={touched.actualAcceptedBackOdds ? errors.actualAcceptedBackOdds : null} id="accepted-back-odds" label="Actual accepted odds (optional)" onBlur={() => normalizeDerivedOdds("actualAcceptedBackOdds")} onChange={(value) => update("actualAcceptedBackOdds", value)} supportingText="Accepted odds take precedence over derived values." value={inputs.actualAcceptedBackOdds} /> : null}
          </div></section>
          <section className="calculator-segment calculator-segment-lay"><div className="calculator-segment-heading"><span className="eyebrow">Lay bet</span></div><div className="calculator-segment-grid calculator-segment-grid-back">
            <SelectField id="exchange" label="Exchange" value={inputs.exchange} onChange={(value) => { const selected = exchanges.find((option) => option.name === value); commissionWasEdited.current = false; updatePatch({ exchange: value, exchangeCommission: selected?.default_commission_rate ?? "" }); }} options={(exchanges.length ? exchanges : [{ name: "Smarkets" }]).map((option) => [option.name, option.name] as const)} />
            <Field error={touched.layOdds ? errors.layOdds : null} id="lay-odds" label="Lay odds" onBlur={() => normalizeOdds("layOdds")} onChange={(value) => update("layOdds", value)} value={inputs.layOdds} />
            <Field error={touched.exchangeCommission ? errors.exchangeCommission : null} id="commission" label="Exchange commission" onChange={(value) => { commissionWasEdited.current = true; update("exchangeCommission", value); }} supportingText="Decimal rate, for example 0.02" value={inputs.exchangeCommission} />
          </div></section>
        </div>
        {(showManualLay || showPromotion || inputs.betType === "profit_boost" || inputs.strategy === "Underlay" || inputs.strategy === "Overlay") ? <div className="form-grid">
          {showManualLay ? <Field error={touched.manualLayStake ? errors.manualLayStake : null} id="manual-lay-stake" label="Explicit lay stake" onChange={(value) => update("manualLayStake", value)} value={inputs.manualLayStake} /> : null}
          {showPromotion ? <Field error={touched.promotionValue ? errors.promotionValue : null} id="promotion-value" label={inputs.betType === "bonus_lock_in" ? "Bonus / refund value" : "Cashback value"} onChange={(value) => update("promotionValue", value)} value={inputs.promotionValue} /> : null}
          {inputs.betType === "bonus_lock_in" ? <Field error={touched.retentionPercent ? errors.retentionPercent : null} id="retention-percent" label="Bonus retention (%)" onChange={(value) => update("retentionPercent", value)} value={inputs.retentionPercent} /> : null}
          {inputs.betType === "profit_boost" && inputs.profitBoostMode === "percentage" ? <Field error={touched.maximumBoostWinnings ? errors.maximumBoostWinnings : null} id="maximum-boost-winnings" label="Maximum boost winnings (optional)" onChange={(value) => update("maximumBoostWinnings", value)} value={inputs.maximumBoostWinnings} /> : null}
          {inputs.betType === "free_bet" && inputs.strategy === "Underlay" ? <Field error={touched.underlayFactor ? errors.underlayFactor : null} id="underlay-factor" label="Underlay factor" onChange={(value) => update("underlayFactor", value)} value={inputs.underlayFactor} /> : null}
          {inputs.betType === "free_bet" && inputs.strategy === "Overlay" ? <Field error={touched.overlayFactor ? errors.overlayFactor : null} id="overlay-factor" label="Overlay factor" onChange={(value) => update("overlayFactor", value)} value={inputs.overlayFactor} /> : null}
        </div> : null}
        {inputs.strategy === "Custom" && customReference ? <SingleLayCustomSlider
          current={Number(inputs.manualLayStake || customReference)}
          maximum={Number(inputs.customMaximum || (Number(customReference) + 1).toFixed(2))}
          maximumText={inputs.customMaximum || (Number(customReference) + 1).toFixed(2)}
          minimum={Number(inputs.customMinimum || Math.max(0.01, Number(customReference) - 1).toFixed(2))}
          minimumText={inputs.customMinimum || Math.max(0.01, Number(customReference) - 1).toFixed(2)}
          onCommit={(value) => update("manualLayStake", Number(value).toFixed(2))}
          onDraft={(value) => update("manualLayStake", Number(value).toFixed(2))}
          onMaximumChange={(value) => update("customMaximum", value)}
          onMinimumChange={(value) => update("customMinimum", value)}
        /> : null}
        {inputs.strategy === "Partial Lay" ? <p className="field-hint">One explicit part-lay amount is supported by the current contract. Multiple execution legs remain pending contract evidence.</p> : null}
        {conversion ? <p className="field-hint" role="status">{conversion}</p> : null}
        {isCalculating ? <p className="field-hint" role="status">Updating outcomes…</p> : null}
        {error ? <p className="error-text" role="alert">{error}</p> : null}
      </div>
      {result ? <div className="calculator-band calculator-band-secondary" data-pd-id="calculators.matched-betting.results"><div className="calculator-panel-card calculator-result-panel"><FinancialValueReplayGroup><article className="calculator-result-card"><div className="calculator-result-card-heading"><strong>{inputs.strategy} reference</strong></div><dl className="calculator-result-card-values"><ResultValue label="Lay stake required" value={result.selected_lay_stake} /><ResultValue label="Liability" value={result.liability} /><ResultValue label="Matched result" value={result.matched_result} />{inputs.betType === "profit_boost" ? <ResultValue label="Effective boosted odds" value={result.effective_back_odds} money={false} /> : null}</dl><button className="review-chip review-chip-copy calculator-result-copy" data-pd-id="calculators.matched-betting.copy-lay-stake" onClick={() => void copyLayStake()} type="button"><span aria-hidden="true" className="material-symbols-outlined">content_copy</span><span>Copy Lay Stake</span></button>{copyFeedback ? <p className="calculator-copy-feedback" role="status">{copyFeedback}</p> : null}</article></FinancialValueReplayGroup></div><CalculatorOutcomes outcomes={result.outcomes} /></div> : null}
    </div></div> : family === "multi-lay" ? <MultiLayCalculator exchanges={exchanges} onState={(params) => { popoutStateRef.current = params; }} search={search} /> : family === "each-way" ? <EachWayCalculator exchanges={exchanges} onState={(params) => { popoutStateRef.current = params; }} search={search} /> : <div className="calculator-panel-shell"><div className="calculator-band calculator-band-primary"><p className="empty-copy">This calculator family remains in the approved queue.</p></div></div>}
  </section>;
}

function validate(inputs: Inputs): Record<string, string | null> {
  const amount = (value: string, required: string) => value === "" ? required : !hasCompleteDecimalInputSyntax(value) ? "Enter a decimal amount using a full stop, for example 10.50." : Number(value) <= 0 ? "Enter an amount greater than zero." : null;
  const decimalRange = (value: string, min: number, max: number, message: string) => !hasCompleteDecimalInputSyntax(value) || Number(value) < min || Number(value) > max ? message : null;
  return {
    backStake: amount(inputs.backStake, "Enter a back stake."),
    backOdds: inputs.betType === "profit_boost" ? null : getSportsbookOddsInputError(inputs.backOdds, { required: true }),
    layOdds: getSportsbookOddsInputError(inputs.layOdds, { required: true }),
    exchangeCommission: decimalRange(inputs.exchangeCommission, 0, 1, "Enter commission as a decimal from 0 to 1, for example 0.02."),
    manualLayStake: inputs.strategy === "Partial Lay" ? amount(inputs.manualLayStake, "Enter the explicit lay stake.") : inputs.strategy === "Custom" && inputs.manualLayStake ? amount(inputs.manualLayStake, "Enter the explicit lay stake.") : null,
    promotionValue: ["bonus_lock_in", "cashback"].includes(inputs.betType) ? amount(inputs.promotionValue, "Enter the cashback or refund value.") : null,
    retentionPercent: inputs.betType === "bonus_lock_in" ? decimalRange(inputs.retentionPercent, 0, 100, "Enter a percentage from 0 to 100.") : null,
    underlayFactor: inputs.strategy === "Underlay" ? decimalRange(inputs.underlayFactor, Number.MIN_VALUE, Infinity, "Enter a factor greater than zero.") : null,
    overlayFactor: inputs.strategy === "Overlay" ? decimalRange(inputs.overlayFactor, Number.MIN_VALUE, Infinity, "Enter a factor greater than zero.") : null,
    boostedBackOdds: inputs.betType === "profit_boost" && inputs.profitBoostMode === "displayed_odds" && !inputs.actualAcceptedBackOdds ? getSportsbookOddsInputError(inputs.boostedBackOdds, { required: true }) : null,
    totalPotentialReturn: inputs.betType === "profit_boost" && inputs.profitBoostMode === "total_return" && !inputs.actualAcceptedBackOdds ? amount(inputs.totalPotentialReturn, "Enter total potential return.") ?? (Number(inputs.totalPotentialReturn) < Number(inputs.backStake) ? "Total return must include and be at least the cash stake." : null) : null,
    potentialProfit: inputs.betType === "profit_boost" && inputs.profitBoostMode === "profit_only" && !inputs.actualAcceptedBackOdds ? amount(inputs.potentialProfit, "Enter potential profit.") : null,
    baseBackOdds: inputs.betType === "profit_boost" && inputs.profitBoostMode === "percentage" && !inputs.actualAcceptedBackOdds ? getSportsbookOddsInputError(inputs.baseBackOdds, { required: true }) : null,
    profitBoostPercent: inputs.betType === "profit_boost" && inputs.profitBoostMode === "percentage" && !inputs.actualAcceptedBackOdds ? decimalRange(inputs.profitBoostPercent, Number.MIN_VALUE, Infinity, "Enter a Profit Boost percentage greater than zero.") : null,
    actualAcceptedBackOdds: inputs.actualAcceptedBackOdds ? getSportsbookOddsInputError(inputs.actualAcceptedBackOdds, { required: false }) : null,
    maximumBoostWinnings: inputs.maximumBoostWinnings ? amount(inputs.maximumBoostWinnings, "Enter maximum boost winnings.") : null,
  };
}

type MultiLayInputs = {
  allocation: "standard" | "underlay";
  backStake: string;
  backOdds: string;
  exchange: string;
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
    exchange: "Smarkets",
    commission: "0",
    outcomes: [{ label: "Outcome 1", layOdds: "" }, { label: "Outcome 2", layOdds: "" }],
  };
  try {
    const parsed = JSON.parse(search.get("multiLay") ?? "null") as MultiLayInputs | null;
    return parsed && Array.isArray(parsed.outcomes) && parsed.outcomes.length >= 2 && parsed.outcomes.length <= 3 ? parsed : fallback;
  } catch { return fallback; }
}

function MultiLayCalculator({ exchanges, onState, search }: { exchanges: ExchangeOption[]; onState: (params: URLSearchParams) => void; search: URLSearchParams }) {
  const [inputs, setInputs] = useState<MultiLayInputs>(() => readMultiLay(search));
  const [result, setResult] = useState<MultiLayResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");
  const requestVersion = useRef(0);
  const requestAbort = useRef<AbortController | null>(null);
  const invalid = !isPositiveAmount(inputs.backStake) || Boolean(getSportsbookOddsInputError(inputs.backOdds, { required: true })) || commissionError(inputs.commission) !== null || inputs.outcomes.some((outcome) => !outcome.label.trim() || Boolean(getSportsbookOddsInputError(outcome.layOdds, { required: true })));
  useEffect(() => {
    const params = new URLSearchParams({ family: "multi-lay", multiLay: JSON.stringify(inputs) });
    onState(params);
  }, [inputs, onState]);
  function update(next: MultiLayInputs) { requestAbort.current?.abort(); requestVersion.current += 1; setInputs(next); setResult(null); setError(""); setCopyFeedback(""); setBusy(false); }
  function updateOutcome(index: number, field: "label" | "layOdds", value: string) {
    update({ ...inputs, outcomes: inputs.outcomes.map((outcome, at) => at === index ? { ...outcome, [field]: value } : outcome) });
  }
  function normalizeOutcome(index: number) {
    const normalized = normalizeCalculatorOddsInput(inputs.outcomes[index].layOdds);
    if (normalized.converted) updateOutcome(index, "layOdds", normalized.canonicalValue);
  }
  async function calculate() {
    if (invalid) return;
    const version = ++requestVersion.current; const controller = new AbortController(); requestAbort.current = controller; setBusy(true); setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/fund-manager/calculators/multi-lay/preview`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ allocation: inputs.allocation, back_stake: inputs.backStake, back_odds: inputs.backOdds, exchange_commission: inputs.commission, outcomes: inputs.outcomes.map((outcome) => ({ label: outcome.label, lay_odds: outcome.layOdds })) }) });
      if (!response.ok) throw new Error(formatApiErrorBody(await response.text(), "Unable to calculate Multi-Lay."));
      const next = await response.json() as MultiLayResult; if (version === requestVersion.current) setResult(next);
    } catch (caught) { if (version === requestVersion.current && !(caught instanceof DOMException && caught.name === "AbortError")) setError(caught instanceof Error ? caught.message : "Unable to calculate Multi-Lay."); }
    finally { if (version === requestVersion.current) setBusy(false); }
  }
  const multiInputKey = JSON.stringify(inputs);
  useEffect(() => {
    if (invalid) { requestAbort.current?.abort(); return; }
    const timer = window.setTimeout(() => { void calculate(); }, 120);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiInputKey, invalid]);
  useEffect(() => () => requestAbort.current?.abort(), []);
  return <div className="calculator-panel-shell" data-pd-id="calculators.multi-lay.presentation"><div className="calculator-shell">
    <div className="calculator-band calculator-band-primary"><div className="calculator-segment calculator-segment-back"><div className="calculator-segment-grid calculator-segment-grid-back"><Field error={null} id="multi-back-stake" label="Back stake" onChange={(value) => update({ ...inputs, backStake: value })} value={inputs.backStake} /><Field error={getSportsbookOddsInputError(inputs.backOdds, { required: false })} id="multi-back-odds" label="Back odds" onBlur={() => { const normalized = normalizeCalculatorOddsInput(inputs.backOdds); if (normalized.converted) update({ ...inputs, backOdds: normalized.canonicalValue }); }} onChange={(value) => update({ ...inputs, backOdds: value })} value={inputs.backOdds} /></div></div></div>
    <div className="calculator-band calculator-band-primary calculator-band-single calculator-band-multilay">
      <div className="calculator-panel-card calculator-panel-card-multilay">
        <div className="multi-lay-calculator-title-row"><span className="eyebrow">Multi-Lay Calculator</span></div>
        <div className="stack">
          <div className="multi-lay-planner-toolbar">
            <button aria-checked={inputs.allocation === "underlay"} className={`material-switch${inputs.allocation === "underlay" ? " is-selected" : ""}`} onClick={() => update({ ...inputs, allocation: inputs.allocation === "underlay" ? "standard" : "underlay" })} role="switch" type="button"><span aria-hidden="true" className="material-switch-track"><span className="material-switch-thumb" /></span><span>Underlay</span></button>
            <SelectField id="multi-exchange" label="Exchange" value={inputs.exchange} onChange={(value) => { const selected = exchanges.find((option) => option.name === value); update({ ...inputs, exchange: value, commission: selected?.default_commission_rate ?? "" }); }} options={(exchanges.length ? exchanges : [{ name: "Smarkets" }]).map((option) => [option.name, option.name] as const)} />
            <Field error={commissionError(inputs.commission)} id="multi-commission" label="Exchange commission" onChange={(value) => update({ ...inputs, commission: value })} value={inputs.commission} />
          </div>
          <div className="multi-lay-grid-wrap"><div className="multi-lay-table-heading">Outcome Table</div><table className="data-table multi-lay-planner-grid"><thead><tr><th>#</th><th>Outcome</th><th>Odds</th><th>{inputs.allocation === "underlay" ? "Underlay Stake" : "Lay Stake"}</th><th>Liability</th><th>Actions</th></tr></thead><tbody>
            {inputs.outcomes.map((outcome, index) => { const branch = result?.branches[index]; return <tr data-pd-id={`calculators.multi-lay.outcome-${index + 1}`} key={index}>
              <td>{index + 1}</td><td><label className="field-control"><span className="sr-only">Outcome {index + 1} name</span><input aria-invalid={!outcome.label.trim()} data-pd-id={`calculators.multi-outcome-${index + 1}-label`} onChange={(event) => updateOutcome(index, "label", event.target.value)} value={outcome.label} /></label></td>
              <td><label className="field-control"><span className="sr-only">Outcome {index + 1} lay odds</span><input aria-invalid={Boolean(getSportsbookOddsInputError(outcome.layOdds, { required: false }))} data-pd-id={`calculators.multi-outcome-${index + 1}-odds`} inputMode="decimal" onBlur={() => normalizeOutcome(index)} onChange={(event) => updateOutcome(index, "layOdds", event.target.value)} value={outcome.layOdds} /></label></td>
              <td>{branch ? <FinancialValue label={`${branch.label} lay stake`} tone="inherit" value={branch.lay_stake} /> : <span>£ -</span>}</td><td>{branch ? <FinancialValue label={`${branch.label} liability`} tone="inherit" value={branch.liability} /> : <span>£ -</span>}</td>
              <td><div className="multi-lay-row-actions"><button aria-label={`Copy stake for ${outcome.label || `outcome ${index + 1}`}`} className="icon-button multi-lay-action-button" disabled={!branch} onClick={() => { if (branch) void copyCalculatorValue(branch.lay_stake, setCopyFeedback); }} type="button"><span aria-hidden="true" className="material-symbols-outlined">copy_all</span></button>{index >= 2 ? <button aria-label={`Remove ${outcome.label || `outcome ${index + 1}`}`} className="icon-button icon-button-destructive multi-lay-action-button" onClick={() => update({ ...inputs, outcomes: inputs.outcomes.filter((_, at) => at !== index) })} type="button"><span aria-hidden="true" className="material-symbols-outlined">delete</span></button> : <span aria-hidden="true" className="multi-lay-action-placeholder" />}</div></td>
            </tr>; })}
          </tbody></table></div>
          <div className="tracker-nav multi-lay-add-row"><button className="button-link" disabled={inputs.outcomes.length >= 3} onClick={() => update({ ...inputs, outcomes: [...inputs.outcomes, { label: `Outcome ${inputs.outcomes.length + 1}`, layOdds: "" }] })} type="button">Add outcome</button></div>
          {result ? <div className="multi-lay-grid-wrap" data-pd-id="calculators.multi-lay.outcomes"><div className="multi-lay-table-heading">Outcomes</div><table className="data-table multi-lay-results-grid"><thead><tr><th>Outcome</th><th>Profit</th></tr></thead><tbody>{result.branches.map((branch) => <FinancialValueReplayGroup key={branch.label}><tr><td>{branch.label}</td><td><FinancialValue label={`${branch.label} outcome value`} value={branch.outcome_value} /></td></tr></FinancialValueReplayGroup>)}<tr><td>No selection wins</td><td><FinancialValue label="No selection wins" value={result.no_selection_value} /></td></tr></tbody><tfoot><tr><td>Total liability</td><td><FinancialValue label="Total liability" value={result.total_liability} /></td></tr><tr><td>Matched result</td><td><FinancialValue label="Matched result" value={result.matched_result} /></td></tr></tfoot></table></div> : null}
          {busy ? <p className="field-hint" role="status">Updating outcomes…</p> : null}
          {error ? <p className="error-text" role="alert">{error}</p> : null}{copyFeedback ? <p className="calculator-copy-feedback" role="status">{copyFeedback}</p> : null}
        </div>
      </div>
    </div>
  </div></div>;
}

type EachWayInputs = { mode: "Each Way" | "Extra Place"; stake: string; backOdds: string; term: string; bookmakerPlaces: string; exchangePlaces: string; exchange: string; winLayOdds: string; placeLayOdds: string; winCommission: string; placeCommission: string };
type EachWayResult = {
  mode: EachWayInputs["mode"];
  place_back_odds: string;
  win_lay_stake: string;
  place_lay_stake: string;
  win_liability: string;
  place_liability: string;
  qualifying_loss: string;
  extra_place_profit: string | null;
  first_place_pnl: string;
  standard_place_pnl: string;
  extra_place_pnl: string | null;
  unplaced_pnl: string;
  current_value: string;
  first_place_bookie_win_pnl: string;
  first_place_bookie_place_pnl: string;
  first_place_exchange_win_pnl: string;
  first_place_exchange_place_pnl: string;
  standard_place_bookie_win_pnl: string;
  standard_place_bookie_place_pnl: string;
  standard_place_exchange_win_pnl: string;
  standard_place_exchange_place_pnl: string;
  extra_place_bookie_win_pnl: string | null;
  extra_place_bookie_place_pnl: string | null;
  extra_place_exchange_win_pnl: string | null;
  extra_place_exchange_place_pnl: string | null;
  unplaced_bookie_win_pnl: string;
  unplaced_bookie_place_pnl: string;
  unplaced_exchange_win_pnl: string;
  unplaced_exchange_place_pnl: string;
};
const eachWayDefaults: EachWayInputs = { mode: "Each Way", stake: "", backOdds: "", term: "5", bookmakerPlaces: "4", exchangePlaces: "4", exchange: "Smarkets", winLayOdds: "", placeLayOdds: "", winCommission: "0", placeCommission: "0" };
function readEachWay(search: URLSearchParams): EachWayInputs { try { return { ...eachWayDefaults, ...(JSON.parse(search.get("eachWay") ?? "null") ?? {}) }; } catch { return eachWayDefaults; } }
function EachWayCalculator({ exchanges, onState, search }: { exchanges: ExchangeOption[]; onState: (params: URLSearchParams) => void; search: URLSearchParams }) {
  const [inputs, setInputs] = useState<EachWayInputs>(() => readEachWay(search));
  const [result, setResult] = useState<EachWayResult | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [copyFeedback, setCopyFeedback] = useState("");
  const requestVersion = useRef(0); const requestAbort = useRef<AbortController | null>(null);
  const invalid = !isPositiveAmount(inputs.stake) || Boolean(getSportsbookOddsInputError(inputs.backOdds, { required: true })) || Boolean(getSportsbookOddsInputError(inputs.winLayOdds, { required: true })) || Boolean(getSportsbookOddsInputError(inputs.placeLayOdds, { required: true })) || !/^\d+$/.test(inputs.term) || Number(inputs.term) <= 0 || !/^\d+$/.test(inputs.bookmakerPlaces) || !/^\d+$/.test(inputs.exchangePlaces) || (inputs.mode === "Each Way" ? inputs.bookmakerPlaces !== inputs.exchangePlaces : Number(inputs.bookmakerPlaces) <= Number(inputs.exchangePlaces)) || commissionError(inputs.winCommission) !== null || commissionError(inputs.placeCommission) !== null;
  useEffect(() => { onState(new URLSearchParams({ family: "each-way", eachWay: JSON.stringify(inputs) })); }, [inputs, onState]);
  function update(patch: Partial<EachWayInputs>) { requestAbort.current?.abort(); requestVersion.current += 1; setInputs((current) => ({ ...current, ...patch })); setResult(null); setError(""); setCopyFeedback(""); setBusy(false); }
  function switchMode(mode: EachWayInputs["mode"]) { update(mode === "Each Way" ? { mode, exchangePlaces: inputs.bookmakerPlaces } : { mode, bookmakerPlaces: Number(inputs.bookmakerPlaces) > Number(inputs.exchangePlaces) ? inputs.bookmakerPlaces : String(Number(inputs.exchangePlaces || "4") + 1) }); }
  function normalize(field: "backOdds" | "winLayOdds" | "placeLayOdds") { const normalized = normalizeCalculatorOddsInput(inputs[field]); if (normalized.converted) update({ [field]: normalized.canonicalValue }); }
  async function calculate() { if (invalid) return; const version = ++requestVersion.current; const controller = new AbortController(); requestAbort.current = controller; setBusy(true); setError(""); try { const response = await fetch(`${apiBaseUrl}/fund-manager/calculators/each-way/preview`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ mode: inputs.mode, each_way_stake: inputs.stake, back_odds: inputs.backOdds, place_term_numerator: "1", place_term_denominator: inputs.term, bookmaker_places: Number(inputs.bookmakerPlaces), exchange_places: Number(inputs.exchangePlaces), win_lay_odds: inputs.winLayOdds, place_lay_odds: inputs.placeLayOdds, win_commission: inputs.winCommission, place_commission: inputs.placeCommission }) }); if (!response.ok) throw new Error(formatApiErrorBody(await response.text(), "Unable to calculate Each Way.")); const next = await response.json() as EachWayResult; if (version === requestVersion.current) setResult(next); } catch (caught) { if (version === requestVersion.current && !(caught instanceof DOMException && caught.name === "AbortError")) setError(caught instanceof Error ? caught.message : "Unable to calculate Each Way."); } finally { if (version === requestVersion.current) setBusy(false); } }
  const eachWayInputKey = JSON.stringify(inputs);
  useEffect(() => {
    if (invalid) { requestAbort.current?.abort(); return; }
    const timer = window.setTimeout(() => { void calculate(); }, 120);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eachWayInputKey, invalid]);
  useEffect(() => () => requestAbort.current?.abort(), []);
  const outcomes: EachWayOutcomeRow[] = [
    { key: "win", label: "First Place", bookmaker: [result?.first_place_bookie_win_pnl, result?.first_place_bookie_place_pnl], exchange: [result?.first_place_exchange_win_pnl, result?.first_place_exchange_place_pnl], total: result?.first_place_pnl, result: "Win" },
    { key: "standard", label: "Standard Place", bookmaker: [result?.standard_place_bookie_win_pnl, result?.standard_place_bookie_place_pnl], exchange: [result?.standard_place_exchange_win_pnl, result?.standard_place_exchange_place_pnl], total: result?.standard_place_pnl, result: "Standard Place" },
    ...(inputs.mode === "Extra Place" ? [{ key: "extra", label: "Extra Place", bookmaker: [result?.extra_place_bookie_win_pnl, result?.extra_place_bookie_place_pnl], exchange: [result?.extra_place_exchange_win_pnl, result?.extra_place_exchange_place_pnl], total: result?.extra_place_pnl, result: "Extra Place" }] : []),
    { key: "unplaced", label: "Doesn't Place", bookmaker: [result?.unplaced_bookie_win_pnl, result?.unplaced_bookie_place_pnl], exchange: [result?.unplaced_exchange_win_pnl, result?.unplaced_exchange_place_pnl], total: result?.unplaced_pnl, result: "Unplaced" },
  ];
  const stakeChoices = ["£ 2.50", "£ 5.00", "£ 10.00"];
  const termChoices = ["1/4", "1/5", "1/6"];
  const placeChoices = ["Paying 4 instead of 3", "Paying 5 instead of 4", "Paying 6 instead of 4", "Paying 6 instead of 5", "Paying 8 instead of 5", "Paying 10 instead of 8"];
  return <div className="calculator-panel-shell extra-place-calculator-presentation extra-place-theme-ep" data-pd-id="calculators.each-way.presentation"><div className="calculator-shell"><div className="calculator-band calculator-band-primary stack">
    <EachWayModeToggle mode={inputs.mode} onChange={switchMode} />
    <div className="ledger-calculator-mode-bar"><SelectField id="each-way-exchange" label="Exchange" value={inputs.exchange} onChange={(value) => { const selected = exchanges.find((option) => option.name === value); update({ exchange: value, winCommission: selected?.default_commission_rate ?? "", placeCommission: selected?.default_commission_rate ?? "" }); }} options={(exchanges.length ? exchanges : [{ name: "Smarkets" }]).map((option) => [option.name, option.name] as const)} /></div>
    <EachWayBackBetSection placeTerms={<EachWayPlaceTermsSection
      summary={inputs.mode === "Extra Place" ? `Paying ${inputs.bookmakerPlaces || "—"} instead of ${inputs.exchangePlaces || "—"}.` : `Paying ${inputs.bookmakerPlaces || "—"} places.`}
      quickChoices={<div className="extra-place-quick-choice-row"><QuickSelectRail ariaLabel="Place terms quick choices" choices={placeChoices.map((label) => ({ label, value: label }))} onSelect={(choice) => { const match = choice.match(/Paying (\d+) instead of (\d+)/); if (match) update({ bookmakerPlaces: match[1], exchangePlaces: match[2] }); }} selectedValues={[`Paying ${inputs.bookmakerPlaces} instead of ${inputs.exchangePlaces}`]} /></div>}
    >
      <Field error={null} id="each-way-bookmaker-places" inputMode="numeric" label="Bookmaker Pays" onChange={(value) => update({ bookmakerPlaces: value, ...(inputs.mode === "Each Way" ? { exchangePlaces: value } : {}) })} value={inputs.bookmakerPlaces} />
      <Field error={null} id="each-way-exchange-places" inputMode="numeric" label="Exchange Pays" onChange={(value) => update({ exchangePlaces: value, ...(inputs.mode === "Each Way" ? { bookmakerPlaces: value } : {}) })} value={inputs.exchangePlaces} />
    </EachWayPlaceTermsSection>}>
      <div className="extra-place-field-with-chips">
        <Field error={null} id="each-way-stake" label="E/W Stake (each way)" onChange={(value) => update({ stake: value })} value={inputs.stake} />
        <EachWayStakeSummary stake={inputs.stake} />
        <div className="extra-place-quick-choice-row"><QuickSelectRail ariaLabel="Each-way stake quick choices" choices={stakeChoices.map((label) => ({ label, value: label }))} onSelect={(choice) => update({ stake: choice.replace(/[^\d.]/g, "") })} selectedValues={[]} /></div>
      </div>
      <Field error={getSportsbookOddsInputError(inputs.backOdds, { required: false })} id="each-way-back-odds" label="Back Odds" onBlur={() => normalize("backOdds")} onChange={(value) => update({ backOdds: value })} value={inputs.backOdds} />
      <EachWayTermField dataPdId="calculators.each-way-term" inputId="calculator-each-way-term" onChange={(value) => update({ term: value })} quickChoices={<div className="extra-place-quick-choice-row"><QuickSelectRail ariaLabel="Each-way terms quick choices" choices={termChoices.map((label) => ({ label, value: label }))} onSelect={(choice) => update({ term: choice.split("/")[1] })} selectedValues={[`1/${inputs.term}`]} /></div>} value={inputs.term} />
    </EachWayBackBetSection>
    <EachWayLaySection kind="win" label="Lay The Win" liability={result?.win_liability} onCopy={(value) => { if (value) void copyCalculatorValue(value, setCopyFeedback); }} stake={result?.win_lay_stake}>
      <Field error={getSportsbookOddsInputError(inputs.winLayOdds, { required: false })} id="each-way-win-lay-odds" label="Lay Odds" onBlur={() => normalize("winLayOdds")} onChange={(value) => update({ winLayOdds: value })} value={inputs.winLayOdds} />
      <Field error={commissionError(inputs.winCommission)} id="each-way-win-commission" label="Win Commission" onChange={(value) => update({ winCommission: value })} value={inputs.winCommission} />
    </EachWayLaySection>
    <EachWayLaySection kind="place" label="Lay The Place" liability={result?.place_liability} onCopy={(value) => { if (value) void copyCalculatorValue(value, setCopyFeedback); }} stake={result?.place_lay_stake}>
      <Field error={getSportsbookOddsInputError(inputs.placeLayOdds, { required: false })} id="each-way-place-lay-odds" label="Lay Odds" onBlur={() => normalize("placeLayOdds")} onChange={(value) => update({ placeLayOdds: value })} value={inputs.placeLayOdds} />
      <Field error={commissionError(inputs.placeCommission)} id="each-way-place-commission" label="Place Commission" onChange={(value) => update({ placeCommission: value })} value={inputs.placeCommission} />
    </EachWayLaySection>
    {busy ? <p className="field-hint" role="status">Updating outcomes…</p> : null}
    {error ? <p className="error-text" role="alert">{error}</p> : null}
    {copyFeedback ? <p className="calculator-copy-feedback" role="status">{copyFeedback}</p> : null}
    <EachWayOutcomeMatrix inspectionId="calculators.each-way.outcomes" outcomes={outcomes} qualifyingLoss={result?.qualifying_loss} selectedResult="" />
  </div></div></div>;
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
function CalculatorOutcomes({ outcomes }: { outcomes: Outcome[] }) {
  return <section className="calculator-outcomes" data-pd-id="calculators.outcomes">
    <div className="calculator-result-card-heading"><strong>Outcomes</strong></div>
    <div className="table-scroll"><table className="data-table calculator-outcomes-table"><thead><tr><th>Outcome</th><th>Bookmaker</th><th>Exchange</th><th>Bonus / cashback</th><th>Total</th></tr></thead><tbody>{outcomes.map((outcome) => <FinancialValueReplayGroup key={outcome.key}><tr><th scope="row">{outcome.label}</th><td><FinancialValue label={`${outcome.label} bookmaker component`} value={outcome.bookmaker_component} /></td><td><FinancialValue label={`${outcome.label} exchange component`} value={outcome.exchange_component} /></td><td>{outcome.promotion_component ? <FinancialValue label={`${outcome.label} promotion component`} value={outcome.promotion_component} /> : <span>—</span>}</td><td><FinancialValue label={`${outcome.label} total`} value={outcome.total} /></td></tr></FinancialValueReplayGroup>)}</tbody></table></div>
  </section>;
}
function ResultValue({ label, money = true, value }: { label: string; money?: boolean; value: string }) { return <div><dt>{label}</dt><dd>{money ? <FinancialValue label={label} value={value} /> : value}</dd></div>; }
