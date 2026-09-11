"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { CalculatorOutcomes, CalculatorOutcomeValueDisplay } from "@/components/calculator-outcomes";
import { CalculatorReferenceSection } from "@/components/calculator-reference-section";
import { CalculatorConversionDialog } from "@/components/calculator-conversion-dialog";
import { CalculatorSegmentedControl } from "@/components/calculator-segmented-control";
import { BlackjackCalculator } from "@/components/blackjack-calculator";
import { CopyableFinancialValue } from "@/components/copyable-financial-value";
import { FinancialValue, FinancialValueReplayGroup } from "@/components/financial-value";
import {
  EachWayBackBetSection,
  EachWayColourSchemeToggle,
  EachWayLaySection,
  EachWayModeToggle,
  EachWayOutcomeMatrix,
  EachWayPlaceTermsSection,
  EachWayStakeSummary,
  EachWayTermField,
  type EachWayColourScheme,
  type EachWayOutcomeRow,
} from "@/components/each-way-calculator-presentation";
import { QuickSelectRail } from "@/components/quick-select-rail";
import { SingleLayCustomSlider } from "@/components/single-lay-custom-slider";
import { useTheme } from "@/components/theme-provider";
import { apiBaseUrl } from "@/lib/api";
import { formatApiErrorBody } from "@/lib/api-error";
import { hasCompleteDecimalInputSyntax, getSportsbookOddsInputError, normalizeCalculatorOddsInput } from "@/lib/sportsbook-odds-input";
import { resolveEachWayColourScheme } from "@/lib/theme";

type BetType = "qualifying" | "free_bet" | "bonus_lock_in" | "cashback" | "profit_boost";
type Strategy = "Standard" | "Underlay" | "Overlay" | "Custom" | "Partial Lay";
type ProfitBoostMode = "displayed_odds" | "total_return" | "profit_only" | "percentage";
type Family = "matched-betting" | "multi-lay" | "each-way" | "sequential-lay" | "early-payout" | "multiples" | "dutching" | "odds-converter" | "blackjack";
type Inputs = {
  betType: BetType; freeBetMode: "SNR" | "SR"; promotionMode: "standard" | "cashback";
  presentationMode: "Simple" | "Advanced";
  strategy: Strategy; backStake: string; backOdds: string; layOdds: string;
  exchange: string; exchangeCommission: string; manualLayStake: string; promotionValue: string;
  customMinimum: string; customMaximum: string;
  bonusTrigger: "Lay Wins" | "Back Wins";
  bonusBackingBet: "Normal" | "SNR" | "SR";
  retentionPercent: string; underlayFactor: string; overlayFactor: string;
  profitBoostMode: ProfitBoostMode; boostedBackOdds: string; totalPotentialReturn: string;
  potentialProfit: string; baseBackOdds: string; profitBoostPercent: string;
  actualAcceptedBackOdds: string; maximumBoostWinnings: string;
};
type Outcome = { key: string; label: string; bookmaker_component: string; exchange_component: string; promotion_component: string | null; total: string };
type ExchangeOption = { catalogue_id: string; name: string; default_commission_rate: string };
type ProfitBoostPreview = { calculation_state: string; notes: string[]; source: string; reference_odds: string | null; raw_derived_odds: string | null; effective_odds: string | null; bookmaker_total_return: string | null; effective_odds_return: string | null; potential_profit: string | null; equation: string };
type Result = {
  result_kind: "reference"; calculation_state: string; calculator_family: "matched-betting";
  canonical_back_odds: string; canonical_lay_odds: string; selected_lay_stake: string;
  reference_lay_stake_standard: string; reference_lay_stake_underlay: string | null;
  reference_lay_stake_overlay: string | null; liability: string; pnl_if_back_wins: string;
  pnl_if_lay_wins: string; matched_result: string;
  promotion_trigger_result: string | null;
  effective_back_odds: string; profit_boost_source: string | null; outcomes: Outcome[];
  strategy_references: Array<{ strategy: string; lay_stake: string; liability: string; back_wins_total: string; back_loses_total: string }>;
  profit_boost_raw_odds: string | null; profit_boost_bookmaker_return: string | null;
  profit_boost_effective_return: string | null; profit_boost_potential_profit: string | null;
  profit_boost_equation: string | null;
};

const defaults: Inputs = {
  betType: "qualifying", freeBetMode: "SNR", promotionMode: "standard", presentationMode: "Simple", strategy: "Standard",
  backStake: "", backOdds: "", layOdds: "", exchange: "Smarkets", exchangeCommission: "0", manualLayStake: "",
  promotionValue: "", customMinimum: "", customMaximum: "", bonusTrigger: "Lay Wins", bonusBackingBet: "Normal", retentionPercent: "70", underlayFactor: "0.928", overlayFactor: "1.300",
  profitBoostMode: "displayed_odds", boostedBackOdds: "", totalPotentialReturn: "", potentialProfit: "",
  baseBackOdds: "", profitBoostPercent: "", actualAcceptedBackOdds: "", maximumBoostWinnings: "",
};
const families: Array<{ label: string; value: Family }> = [
  { value: "matched-betting", label: "Standard" },
  { value: "multi-lay", label: "Multi-Lay" },
  { value: "each-way", label: "Extra Place / Each Way" },
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const page = selectedPage;
  const familyPages = Array.from({ length: pageCount }, (_, pageIndex) => families.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize));

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
    setMenuOpen(false);
  }

  function chooseAdjacent(offset: -1 | 1) {
    const next = families[selectedIndex + offset];
    if (next) choose(next.value);
  }

  return <nav aria-label="Calculator families" className={`calculator-family-selector${hasPages ? "" : " is-static"}`} data-pd-id="calculators.family-selector">
    {hasPages ? <button aria-label="Select previous calculator" className="icon-button compact-action calculator-family-page-action" disabled={selectedIndex === 0} onClick={() => chooseAdjacent(-1)} type="button"><span aria-hidden="true" className="material-symbols-outlined">chevron_left</span></button> : null}
    <div className="calculator-family-viewport" data-pd-id="calculators.family-page">
      <div className="calculator-family-track" style={{ "--calculator-family-page": page } as CSSProperties}>
        {familyPages.map((items, pageIndex) => <div aria-hidden={pageIndex !== page} className="calculator-family-page" data-page={pageIndex} key={pageIndex}>
          {items.map((item) => <button aria-current={item.value === selected ? "page" : undefined} aria-pressed={item.value === selected} className={`review-chip${item.value === selected ? " is-active" : ""}`} key={item.value} onClick={() => choose(item.value)} tabIndex={pageIndex === page ? 0 : -1} type="button">{item.label}</button>)}
        </div>)}
      </div>
    </div>
    {hasPages ? <button aria-label="Select next calculator" className="icon-button compact-action calculator-family-page-action" disabled={selectedIndex === families.length - 1} onClick={() => chooseAdjacent(1)} type="button"><span aria-hidden="true" className="material-symbols-outlined">chevron_right</span></button> : null}
    {hasPages ? <div className="app-menu-shell calculator-family-more-shell" ref={menuRef}>
      <button aria-controls="calculator-family-menu" aria-expanded={menuOpen} aria-haspopup="menu" aria-label="Show all calculators" className="icon-button compact-action calculator-family-more-action" onClick={() => setMenuOpen((current) => !current)} type="button"><span aria-hidden="true" className="material-symbols-outlined">more_horiz</span></button>
      <div className={`app-menu-panel app-menu-panel-right calculator-family-menu${menuOpen ? " is-open" : ""}`} id="calculator-family-menu" role="menu">
        {families.map((item) => <button aria-current={item.value === selected ? "page" : undefined} className={`nav-pill${item.value === selected ? " is-active" : ""}`} key={item.value} onClick={() => choose(item.value)} role="menuitem" type="button">{item.label}</button>)}
      </div>
    </div> : null}
  </nav>;
}

function CalculatorSegmentEyebrow({ children }: { children: string }) {
  return <div className="calculator-segment-heading"><span className="eyebrow">{children}</span></div>;
}

function CalculatorFamilyHeading({ onOpen, primary = false, title }: { onOpen?: () => void; primary?: boolean; title: string }) {
  return <div className="calculator-panel-heading" data-pd-id="calculators.active-header">
    <div className="calculator-panel-heading-row">
      {primary ? <h1 id="calculator-workspace-title">{title}</h1> : <h2>{title}</h2>}
      {onOpen ? <div className="tracker-nav" data-pd-id="calculators.header-actions">
        <button className="button-link icon-text-action" data-pd-id="calculators.open-new-tab" onClick={onOpen} type="button"><span aria-hidden="true" className="material-symbols-outlined">open_in_new</span><span>Open in new tab</span></button>
      </div> : null}
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
  if (!["Normal", "SNR", "SR"].includes(next.bonusBackingBet)) next.bonusBackingBet = "Normal";
  if (!["Simple", "Advanced"].includes(next.presentationMode)) next.presentationMode = "Simple";
  if (!["Standard", "Underlay", "Overlay", "Custom", "Partial Lay"].includes(next.strategy)) next.strategy = "Standard";
  return next;
}

export function CalculatorWorkspace({ popout = false }: { popout?: boolean }) {
  const search = useSearchParams();
  const requestedFamily = search.get("family") as Family | null;
  const [family, setFamily] = useState<Family>(families.some((item) => item.value === requestedFamily) ? requestedFamily! : "matched-betting");
  const popoutStateRef = useRef(new URLSearchParams({ family }));
  const [conversionCreatedAt] = useState(() => new Date().toISOString());
  const [inputs, setInputs] = useState<Inputs>(() => readInitial(search));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [conversion, setConversion] = useState("");
  const [conversionOpen, setConversionOpen] = useState(false);
  const [conversionReceipt, setConversionReceipt] = useState<Array<{ profile: string; account: string; href: string; state: string }>>([]);
  const [profitBoostPreview, setProfitBoostPreview] = useState<ProfitBoostPreview | null>(null);
  const [exchanges, setExchanges] = useState<ExchangeOption[]>([]);
  const commissionWasEdited = useRef(search.has("exchangeCommission"));
  const [isCalculating, setIsCalculating] = useState(false);
  const bonusValueIsDerived = useRef(!search.has("promotionValue"));
  const requestVersionRef = useRef(0);
  const requestAbortRef = useRef<AbortController | null>(null);
  const errors = useMemo(() => validate(inputs), [inputs]);
  const invalid = Object.values(errors).some(Boolean);

  useEffect(() => {
    if (inputs.betType !== "profit_boost" || !hasCompleteDecimalInputSyntax(inputs.backStake) || Number(inputs.backStake) <= 0) {
      const clearTimer = window.setTimeout(() => setProfitBoostPreview(null), 0);
      return () => window.clearTimeout(clearTimer);
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(`${apiBaseUrl}/fund-manager/calculators/profit-boost/preview`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ mode: inputs.profitBoostMode, back_stake: inputs.backStake, base_back_odds: inputs.baseBackOdds, profit_boost_percent: inputs.profitBoostPercent, boosted_back_odds: inputs.boostedBackOdds, total_potential_return: inputs.totalPotentialReturn, potential_profit: inputs.potentialProfit, actual_accepted_back_odds: inputs.actualAcceptedBackOdds, maximum_boost_winnings: inputs.maximumBoostWinnings }),
      }).then(async (response) => { if (response.ok) setProfitBoostPreview(await response.json() as ProfitBoostPreview); });
    }, 100);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [inputs.actualAcceptedBackOdds, inputs.backStake, inputs.baseBackOdds, inputs.betType, inputs.boostedBackOdds, inputs.maximumBoostWinnings, inputs.potentialProfit, inputs.profitBoostMode, inputs.profitBoostPercent, inputs.totalPotentialReturn]);

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
    setInputs((current) => {
      const next = { ...current, [field]: value };
      if (field === "betType" && value === "bonus_lock_in") {
        bonusValueIsDerived.current = true;
        next.promotionValue = current.backStake;
        next.bonusTrigger = "Lay Wins";
      } else if (field === "backStake" && current.betType === "bonus_lock_in" && bonusValueIsDerived.current) {
        next.promotionValue = String(value);
      } else if (field === "promotionValue" && current.betType === "bonus_lock_in") {
        bonusValueIsDerived.current = false;
      }
      return next;
    });
    setTouched((current) => ({ ...current, [field]: true }));
    setResult(null); setError(""); setConversion(""); setIsCalculating(false);
  }

  function updatePatch(patch: Partial<Inputs>) {
    requestAbortRef.current?.abort(); requestAbortRef.current = null; requestVersionRef.current += 1;
    setInputs((current) => ({ ...current, ...patch }));
    setResult(null); setError(""); setConversion(""); setIsCalculating(false);
  }

  function updateBonusCustomStake(value: number) {
    requestAbortRef.current?.abort(); requestAbortRef.current = null; requestVersionRef.current += 1;
    setInputs((current) => ({ ...current, strategy: "Custom", manualLayStake: value.toFixed(2) }));
    setError(""); setConversion("");
  }

  function updatePresentationMode(mode: Inputs["presentationMode"]) {
    if (mode === "Simple" && inputs.strategy !== "Standard") {
      updatePatch({ presentationMode: mode, strategy: "Standard" });
      setConversion("Simple mode uses the equalised Standard strategy. Your Advanced stake draft is preserved.");
      return;
    }
    updatePatch({ presentationMode: mode });
  }

  function updateQualifyingBackingType(value: "Normal" | "SNR" | "SR") {
    if (value === "Normal") updatePatch({ betType: "qualifying", freeBetMode: "SNR" });
    else updatePatch({ betType: "free_bet", freeBetMode: value });
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
          bonus_backing_bet: inputs.bonusBackingBet,
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
      if (version === requestVersionRef.current) {
        setResult(next);
      }
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
  function openInNewTab() {
    const params = new URLSearchParams(popoutStateRef.current);
    params.set("family", family);
    if (family === "matched-betting") for (const [key, value] of Object.entries(inputs)) params.set(key, value);
    window.open(`/calculator?${params.toString()}`, "_blank", "noopener,noreferrer");
  }

  function resetMatchedCalculator() {
    requestAbortRef.current?.abort(); requestAbortRef.current = null; requestVersionRef.current += 1;
    const smarkets = exchanges.find((option) => option.name === "Smarkets");
    commissionWasEdited.current = false;
    bonusValueIsDerived.current = true;
    setInputs({ ...defaults, exchange: smarkets?.name ?? defaults.exchange, exchangeCommission: smarkets?.default_commission_rate ?? defaults.exchangeCommission });
    setTouched({}); setResult(null); setError(""); setConversion(""); setIsCalculating(false);
    setConversionReceipt([]);
  }

  const showPromotion = inputs.betType === "bonus_lock_in" || inputs.betType === "cashback";
  const showManualLay = inputs.strategy === "Partial Lay";
  const backFieldRows = inputs.betType === "profit_boost" ? (inputs.profitBoostMode === "percentage" ? 4 : 3) : 2;
  const layFieldRows = showManualLay ? 2 : 1;
  const pairedFieldRows = Math.max(backFieldRows, layFieldRows + 1);
  const activeFamilyLabel = families.find((item) => item.value === family)?.label ?? "Calculator";
  const referenceUnderlay = result?.strategy_references?.find((item) => item.strategy === "Underlay");
  const referenceOverlay = result?.strategy_references?.find((item) => item.strategy === "Overlay");
  const referenceStandard = result?.strategy_references?.find((item) => item.strategy === "Standard");
  const advancedMinimumText = inputs.customMinimum || result?.reference_lay_stake_underlay || result?.reference_lay_stake_standard || "0.01";
  const advancedMaximumText = inputs.customMaximum || result?.reference_lay_stake_overlay || result?.reference_lay_stake_standard || "0.02";
  const advancedMinimum = Number(advancedMinimumText);
  const advancedMaximum = Math.max(advancedMinimum + 0.01, Number(advancedMaximumText));
  const advancedCurrent = Math.min(advancedMaximum, Math.max(advancedMinimum, Number(inputs.manualLayStake || result?.reference_lay_stake_standard || advancedMinimumText)));
  const qualifyingBackingType = inputs.betType === "free_bet" ? inputs.freeBetMode : "Normal";
  const showAdvancedReferences = inputs.betType === "bonus_lock_in" || ((inputs.betType === "qualifying" || inputs.betType === "free_bet") && inputs.presentationMode === "Advanced");
  const canConvertMatchedResult = Boolean(result) && !(inputs.betType === "bonus_lock_in" && inputs.bonusBackingBet !== "Normal");
  const profitBoostExample = inputs.profitBoostMode === "displayed_odds"
    ? "Example: £10 at 3.20 → total return £32; profit £22."
    : inputs.profitBoostMode === "total_return"
      ? "Example: £27.86 / £10 = raw odds 2.786; approved hedge odds floor to 2.78. Bookmaker return remains £27.86; conservative odds return is £27.80."
      : inputs.profitBoostMode === "profit_only"
        ? "Example: £22 / £10 + 1 = 3.20; total return £32."
        : "Example: original odds 3.00 and boost 10% → 1 + (3.00 − 1) × 1.10 = 3.20; £10 returns £32 with £22 profit.";
  return <section aria-labelledby="calculator-workspace-title" className={`content-panel stack sportsbook-page-shell${popout ? " calculator-popout-workspace" : ""}`} data-pd-id="calculators.workspace">
    {!popout ? <><div className="workflow-panel-header"><div><span className="eyebrow">Fund Manager</span><h1 id="calculator-workspace-title">Calculators</h1></div></div>
    <CalculatorFamilySelector onSelect={(next) => { popoutStateRef.current = new URLSearchParams({ family: next }); setFamily(next); }} selected={family} /></> : null}
    <CalculatorFamilyHeading onOpen={popout ? undefined : openInNewTab} primary={popout} title={activeFamilyLabel} />
    {family === "matched-betting" ? <div className="calculator-panel-shell"><div className="calculator-shell">
      <div className="calculator-band calculator-band-primary">
        <div className="ledger-calculator-mode-bar">
          <SelectField id="calculator-offer" label="Calculator" value={inputs.betType === "free_bet" ? "qualifying" : inputs.betType} onChange={(value) => update("betType", value as BetType)} options={[["qualifying", "Qualifying / Free Bet"], ["bonus_lock_in", "Bonus Lock-In"], ["cashback", "Cashback"], ["profit_boost", "Profit Boost"]]} />
          {inputs.betType === "qualifying" || inputs.betType === "free_bet" ? <SelectField id="bet-type" label="Bet Type" value={qualifyingBackingType} onChange={(value) => updateQualifyingBackingType(value as "Normal" | "SNR" | "SR")} options={[["Normal", "Normal"], ["SNR", "Free Bet SNR"], ["SR", "Free Bet SR"]]} /> : null}
          {inputs.betType === "qualifying" || inputs.betType === "free_bet" ? <div className="field-control ledger-calculator-mode-field"><span>Mode</span><CalculatorSegmentedControl ariaLabel="Standard calculator mode" dataPdId="calculators.matched-betting.mode" onChange={updatePresentationMode} options={[{ label: "Simple", value: "Simple" }, { label: "Advanced", value: "Advanced" }]} value={inputs.presentationMode} /></div> : null}
          {inputs.betType === "bonus_lock_in" ? <SelectField id="bonus-backing-bet" label="Bet Type" value={inputs.bonusBackingBet} onChange={(value) => updatePatch({ bonusBackingBet: value as Inputs["bonusBackingBet"] })} options={[["Normal", "Normal"], ["SNR", "Free Bet SNR"]]} /> : null}
          {showPromotion ? <SelectField id="bonus-trigger" label={inputs.betType === "bonus_lock_in" ? "Bonus Applied If Bet" : "Cashback applies if bet"} value={inputs.bonusTrigger} onChange={(value) => update("bonusTrigger", value as Inputs["bonusTrigger"])} options={[["Lay Wins", "Loses"], ["Back Wins", "Wins"]]} /> : null}
          {(inputs.betType === "bonus_lock_in" || inputs.betType === "cashback" || inputs.betType === "profit_boost" || ((inputs.betType === "qualifying" || inputs.betType === "free_bet") && inputs.presentationMode === "Advanced")) ? <SelectField id="strategy" label="Actual selected strategy" value={inputs.strategy} onChange={(value) => update("strategy", value as Strategy)} options={[["Standard", "Standard"], ["Underlay", "Underlay"], ["Overlay", "Overlay"], ["Custom", "Custom"], ["Partial Lay", "Part Lay"]]} /> : null}
          {inputs.betType === "profit_boost" ? <SelectField id="profit-boost-mode" label="Boosted price source" value={inputs.profitBoostMode} onChange={(value) => update("profitBoostMode", value as ProfitBoostMode)} options={[["displayed_odds", "Displayed boosted odds"], ["total_return", "Total potential return"], ["profit_only", "Potential profit / winnings"], ["percentage", "Base odds + boost %"]]} /> : null}
        </div>
        <div className={`form-grid calculator-paired-segments calculator-paired-rows-${pairedFieldRows}`} data-pd-id="calculators.matched-betting.paired-segments">
          <section className="calculator-segment calculator-segment-back calculator-paired-segment" style={{ "--calculator-segment-field-rows": backFieldRows, "--calculator-segment-span": backFieldRows + 1 } as CSSProperties}><CalculatorSegmentEyebrow>Back bet</CalculatorSegmentEyebrow><div className="calculator-segment-grid calculator-paired-segment-fields">
            <Field error={touched.backStake ? errors.backStake : null} id="back-stake" label={inputs.betType === "free_bet" ? "Free bet value" : "Back stake"} onChange={(value) => update("backStake", value)} value={inputs.backStake} />
            {inputs.betType !== "profit_boost" ? <Field error={touched.backOdds ? errors.backOdds : null} id="back-odds" label="Back odds" onBlur={() => normalizeOdds("backOdds")} onChange={(value) => update("backOdds", value)} value={inputs.backOdds} /> : null}
            {inputs.betType === "profit_boost" && inputs.profitBoostMode === "displayed_odds" ? <Field error={touched.boostedBackOdds ? errors.boostedBackOdds : null} id="boosted-back-odds" label="Boosted odds displayed" onBlur={() => normalizeDerivedOdds("boostedBackOdds")} onChange={(value) => update("boostedBackOdds", value)} value={inputs.boostedBackOdds} /> : null}
            {inputs.betType === "profit_boost" && inputs.profitBoostMode === "total_return" ? <Field error={touched.totalPotentialReturn ? errors.totalPotentialReturn : null} id="total-potential-return" label="Total potential return" onChange={(value) => update("totalPotentialReturn", value)} supportingText="Includes the returned cash stake." value={inputs.totalPotentialReturn} /> : null}
            {inputs.betType === "profit_boost" && inputs.profitBoostMode === "profit_only" ? <Field error={touched.potentialProfit ? errors.potentialProfit : null} id="potential-profit" label="Potential profit / winnings" onChange={(value) => update("potentialProfit", value)} supportingText="Excludes the returned cash stake." value={inputs.potentialProfit} /> : null}
            {inputs.betType === "profit_boost" && inputs.profitBoostMode === "percentage" ? <><Field error={touched.baseBackOdds ? errors.baseBackOdds : null} id="base-back-odds" label="Original / base odds" onBlur={() => normalizeDerivedOdds("baseBackOdds")} onChange={(value) => update("baseBackOdds", value)} value={inputs.baseBackOdds} /><Field error={touched.profitBoostPercent ? errors.profitBoostPercent : null} id="profit-boost-percent" label="Profit Boost (%)" onChange={(value) => update("profitBoostPercent", value)} value={inputs.profitBoostPercent} /></> : null}
            {inputs.betType === "profit_boost" ? <Field error={touched.actualAcceptedBackOdds ? errors.actualAcceptedBackOdds : null} id="accepted-back-odds" label="Actual accepted odds (optional)" onBlur={() => normalizeDerivedOdds("actualAcceptedBackOdds")} onChange={(value) => update("actualAcceptedBackOdds", value)} supportingText="Accepted odds take precedence over derived values." value={inputs.actualAcceptedBackOdds} /> : null}
          </div></section>
          <section className="calculator-segment calculator-segment-lay calculator-paired-segment" style={{ "--calculator-segment-field-rows": layFieldRows, "--calculator-segment-span": layFieldRows + 2 } as CSSProperties}><CalculatorSegmentEyebrow>Lay bet</CalculatorSegmentEyebrow><div className="calculator-segment-grid calculator-paired-segment-fields">
            <Field error={touched.layOdds ? errors.layOdds : null} id="lay-odds" label="Lay odds" onBlur={() => normalizeOdds("layOdds")} onChange={(value) => update("layOdds", value)} value={inputs.layOdds} />
            {showManualLay ? <Field error={touched.manualLayStake ? errors.manualLayStake : null} id="manual-lay-stake" label="Actual lay stake" onChange={(value) => update("manualLayStake", value)} value={inputs.manualLayStake} /> : null}
          </div><div className="calculator-segment-grid calculator-segment-auxiliary-fields">
            <SelectField id="exchange" label="Exchange" value={inputs.exchange} onChange={(value) => { const selected = exchanges.find((option) => option.name === value); commissionWasEdited.current = false; updatePatch({ exchange: value, exchangeCommission: selected?.default_commission_rate ?? "" }); }} options={(exchanges.length ? exchanges : [{ name: "Smarkets" }]).map((option) => [option.name, option.name] as const)} />
            <Field error={touched.exchangeCommission ? errors.exchangeCommission : null} id="commission" label="Exchange commission" onChange={(value) => { commissionWasEdited.current = true; update("exchangeCommission", value); }} supportingText="Decimal rate, for example 0.02" value={inputs.exchangeCommission} />
          </div></section>
        </div>
        {(showPromotion || inputs.betType === "profit_boost" || inputs.strategy === "Underlay" || inputs.strategy === "Overlay") ? <div className="form-grid">
          {showPromotion ? <Field error={touched.promotionValue ? errors.promotionValue : null} id="promotion-value" label={inputs.betType === "bonus_lock_in" ? "Bonus / refund value" : "Cashback value"} onChange={(value) => update("promotionValue", value)} value={inputs.promotionValue} /> : null}
          {inputs.betType === "bonus_lock_in" ? <Field error={touched.retentionPercent ? errors.retentionPercent : null} id="retention-percent" label="Bonus retention (%)" onChange={(value) => update("retentionPercent", value)} value={inputs.retentionPercent} /> : null}
          {inputs.betType === "profit_boost" && inputs.profitBoostMode === "percentage" ? <Field error={touched.maximumBoostWinnings ? errors.maximumBoostWinnings : null} id="maximum-boost-winnings" label="Maximum boost winnings (optional)" onChange={(value) => update("maximumBoostWinnings", value)} value={inputs.maximumBoostWinnings} /> : null}
          {inputs.betType === "free_bet" && inputs.strategy === "Underlay" ? <Field error={touched.underlayFactor ? errors.underlayFactor : null} id="underlay-factor" label="Underlay factor" onChange={(value) => update("underlayFactor", value)} value={inputs.underlayFactor} /> : null}
          {inputs.betType === "free_bet" && inputs.strategy === "Overlay" ? <Field error={touched.overlayFactor ? errors.overlayFactor : null} id="overlay-factor" label="Overlay factor" onChange={(value) => update("overlayFactor", value)} value={inputs.overlayFactor} /> : null}
        </div> : null}
        {inputs.betType === "profit_boost" && profitBoostPreview?.calculation_state === "resolved" ? <article className="calculator-result-card" data-pd-id="calculators.profit-boost.breakdown"><div className="calculator-result-card-heading"><strong>Boosted odds breakdown</strong></div><p className="calculator-section-guidance">Shows what the bookmaker supplied and the effective odds used for hedging.</p><dl className="calculator-result-card-values"><ResultValue label="Original odds" money={false} value={inputs.baseBackOdds || "Not provided"} /><ResultValue label="Raw derived boosted odds" money={false} value={profitBoostPreview.raw_derived_odds ?? "Cannot derive from these inputs"} /><ResultValue label="Effective odds used" money={false} value={profitBoostPreview.effective_odds ?? "-"} /><ResultValue label="Bookmaker total return" value={profitBoostPreview.bookmaker_total_return ?? "-"} /><ResultValue label="Odds-based conservative return" value={profitBoostPreview.effective_odds_return ?? "-"} /><ResultValue label="Potential profit" value={profitBoostPreview.potential_profit ?? "-"} /></dl></article> : null}
        {inputs.betType === "profit_boost" && profitBoostPreview?.calculation_state === "resolved" ? <details className="calculator-guidance-disclosure"><summary>How this price was calculated</summary><p>{profitBoostPreview.equation}. {inputs.actualAcceptedBackOdds ? `Actual accepted odds ${profitBoostPreview.effective_odds} take precedence.` : "No accepted-odds override is applied."}</p><p>{profitBoostExample}</p></details> : null}
        {inputs.betType === "bonus_lock_in" && inputs.bonusBackingBet === "SR" ? <p className="error-text" role="status">Free Bet SR backing is not currently supported by the verified Bonus Lock-In contract.</p> : null}
        {inputs.strategy === "Partial Lay" ? <p className="field-hint">One explicit part-lay amount is supported by the current contract. Multiple execution legs remain pending contract evidence.</p> : null}
        {conversion ? <p className="field-hint" role="status">{conversion}</p> : null}
        {isCalculating ? <p className="field-hint" role="status">Updating outcomes…</p> : null}
        {error ? <p className="error-text" role="alert">{error}</p> : null}
        <div className="tracker-nav"><button className="button-link icon-text-action" data-pd-id="calculators.matched-betting.reset" onClick={resetMatchedCalculator} type="button"><span aria-hidden="true" className="material-symbols-outlined">restart_alt</span><span>Reset</span></button>{canConvertMatchedResult ? <button className="modal-primary-button icon-text-action" data-pd-id="calculators.matched-betting.convert" onClick={() => { setConversionReceipt([]); setConversionOpen(true); }} type="button"><span aria-hidden="true" className="material-symbols-outlined">move_item</span><span>Convert to opportunity</span></button> : null}</div>
        {conversionReceipt.length ? <section className="calculator-conversion-receipt" data-pd-id="calculators.matched-betting.conversion-receipt" role="status"><strong>Opportunity saved</strong>{conversionReceipt.map((item) => <span key={`${item.profile}:${item.account}:${item.href}`}>{item.profile} · {item.account} · Sportsbook {item.href ? <Link href={item.href}>Open row</Link> : null}</span>)}</section> : null}
      </div>
      {result ? <div className="calculator-band calculator-band-secondary" data-pd-id="calculators.matched-betting.results">
        {showAdvancedReferences ? <section className="stack" data-pd-id={inputs.betType === "bonus_lock_in" ? "calculators.bonus-lock-in.advanced" : "calculators.matched-betting.advanced"}>{inputs.betType === "bonus_lock_in" && referenceStandard ? <CalculatorReferenceSection description="Equalised reference after the selected bonus assumption and penny placement." inspectionId="calculators.bonus-lock-in.standard" rows={[{ label: "Lay stake", value: referenceStandard.lay_stake, copyable: true }, { label: "Liability", value: referenceStandard.liability }, { label: "Back wins", value: referenceStandard.back_wins_total }, { label: "Back loses", value: referenceStandard.back_loses_total }]} title="Standard reference" /> : null}<div className="form-grid">{referenceUnderlay ? <CalculatorReferenceSection description="Lower lay reference; penny placement can leave a small residual." inspectionId={inputs.betType === "bonus_lock_in" ? "calculators.bonus-lock-in.underlay" : "calculators.matched-betting.underlay"} rows={[{ label: "Lay stake", value: referenceUnderlay.lay_stake, copyable: true }, { label: "Liability", value: referenceUnderlay.liability }, { label: "Back wins", value: referenceUnderlay.back_wins_total }, { label: "Back loses", value: referenceUnderlay.back_loses_total }]} title="Underlay reference" /> : <CalculatorReferenceSection description="No valid non-negative endpoint exists for these inputs." inspectionId="calculators.matched-betting.underlay-unavailable" rows={[]} title="Underlay unavailable" />}{referenceOverlay ? <CalculatorReferenceSection description="Upper lay reference; penny placement can leave a small residual." inspectionId={inputs.betType === "bonus_lock_in" ? "calculators.bonus-lock-in.overlay" : "calculators.matched-betting.overlay"} rows={[{ label: "Lay stake", value: referenceOverlay.lay_stake, copyable: true }, { label: "Liability", value: referenceOverlay.liability }, { label: "Back wins", value: referenceOverlay.back_wins_total }, { label: "Back loses", value: referenceOverlay.back_loses_total }]} title="Overlay reference" /> : <CalculatorReferenceSection description="No valid non-negative endpoint exists for these inputs." inspectionId="calculators.matched-betting.overlay-unavailable" rows={[]} title="Overlay unavailable" />}</div><SingleLayCustomSlider current={advancedCurrent} maximum={advancedMaximum} maximumText={advancedMaximumText} minimum={advancedMinimum} minimumText={advancedMinimumText} onCommit={(value) => updateBonusCustomStake(Number(value))} onDraft={(value) => updateBonusCustomStake(Number(value))} onMaximumChange={(value) => update("customMaximum", value)} onMinimumChange={(value) => update("customMinimum", value)} /></section> : null}
        <div className="calculator-panel-card calculator-result-panel"><FinancialValueReplayGroup><article className="calculator-result-card"><div className="calculator-result-card-heading"><strong>{inputs.strategy} reference</strong></div><dl className="calculator-result-card-values"><ResultValue copyable dataPdId="calculators.matched-betting.copy-lay-stake" label="Lay stake required" value={result.selected_lay_stake} /><ResultValue label="Liability" value={result.liability} /><ResultValue label="Matched result" value={result.matched_result} />{inputs.betType === "profit_boost" ? <ResultValue label="Effective boosted odds" value={result.effective_back_odds} money={false} /> : null}</dl></article></FinancialValueReplayGroup></div><CalculatorOutcomes columns={["Bookmaker", "Exchange", "Bonus / cashback"]} inspectionId="calculators.outcomes" rows={result.outcomes.map((outcome, index) => ({ key: outcome.key, label: outcome.label, tone: index === 0 ? "positive" : "exchange", components: [[outcome.bookmaker_component], [outcome.exchange_component], [outcome.promotion_component]], total: outcome.total }))} summary={<span>Matched result <CalculatorOutcomeValueDisplay label="Matched result" value={result.matched_result} /></span>} /></div> : null}
    </div></div> : family === "multi-lay" ? <MultiLayCalculator exchanges={exchanges} onState={(params) => { popoutStateRef.current = params; }} search={search} /> : family === "each-way" ? <EachWayCalculator exchanges={exchanges} onState={(params) => { popoutStateRef.current = params; }} search={search} /> : family === "sequential-lay" ? <SequentialLayCalculator exchanges={exchanges} onState={(params) => { popoutStateRef.current = params; }} search={search} /> : family === "early-payout" ? <EarlyPayoutCalculator exchanges={exchanges} onState={(params) => { popoutStateRef.current = params; }} search={search} /> : family === "multiples" ? <AccumulatorCalculator onState={(params) => { popoutStateRef.current = params; }} search={search} /> : family === "dutching" ? <DutchingCalculator onState={(params) => { popoutStateRef.current = params; }} search={search} /> : family === "odds-converter" ? <OddsProbabilityCalculator onState={(params) => { popoutStateRef.current = params; }} search={search} /> : <BlackjackCalculator onState={(params) => { popoutStateRef.current = params; }} search={search} />}
    {conversionOpen && result ? <CalculatorConversionDialog financial={{ kind: "standard", envelope: { calculator_family: "matched-betting", calculator_version: "matched-betting-v1", calculator_mode: inputs.betType, canonical_inputs: { ...inputs, exchange: inputs.exchange, selected_strategy: inputs.strategy, selected_lay_stake: result.selected_lay_stake, effective_back_odds: result.effective_back_odds }, created_at: conversionCreatedAt }, calculator: { bet_type: inputs.betType, free_bet_mode: inputs.freeBetMode, bonus_backing_bet: inputs.bonusBackingBet, promotion_mode: inputs.promotionMode, strategy: inputs.strategy, back_stake: inputs.backStake, back_odds: inputs.backOdds, lay_odds: inputs.layOdds, exchange_commission: inputs.exchangeCommission, manual_lay_stake: inputs.manualLayStake, promotion_value: inputs.promotionValue, bonus_trigger: inputs.bonusTrigger, retention_percent: inputs.retentionPercent, underlay_factor: inputs.underlayFactor, overlay_factor: inputs.overlayFactor, profit_boost_mode: inputs.profitBoostMode, boosted_back_odds: inputs.boostedBackOdds, total_potential_return: inputs.totalPotentialReturn, potential_profit: inputs.potentialProfit, base_back_odds: inputs.baseBackOdds, profit_boost_percent: inputs.profitBoostPercent, actual_accepted_back_odds: inputs.actualAcceptedBackOdds, maximum_boost_winnings: inputs.maximumBoostWinnings } }} onClose={() => setConversionOpen(false)} onComplete={setConversionReceipt} /> : null}
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
  const requestVersion = useRef(0);
  const requestAbort = useRef<AbortController | null>(null);
  const [conversionCreatedAt] = useState(() => new Date().toISOString());
  const [conversionOpen, setConversionOpen] = useState(false);
  const [conversionReceipt, setConversionReceipt] = useState<Array<{ profile: string; account: string; href: string; state: string }>>([]);
  const invalid = !isPositiveAmount(inputs.backStake) || Boolean(getSportsbookOddsInputError(inputs.backOdds, { required: true })) || commissionError(inputs.commission) !== null || inputs.outcomes.some((outcome) => !outcome.label.trim() || Boolean(getSportsbookOddsInputError(outcome.layOdds, { required: true })));
  useEffect(() => {
    const params = new URLSearchParams({ family: "multi-lay", multiLay: JSON.stringify(inputs) });
    onState(params);
  }, [inputs, onState]);
  function update(next: MultiLayInputs) { requestAbort.current?.abort(); requestVersion.current += 1; setInputs(next); setResult(null); setError(""); setBusy(false); }
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
  function resetCalculator() {
    requestAbort.current?.abort(); requestVersion.current += 1;
    const smarkets = exchanges.find((option) => option.name === "Smarkets");
    setInputs({ ...readMultiLay(new URLSearchParams()), exchange: smarkets?.name ?? "Smarkets", commission: smarkets?.default_commission_rate ?? "0" });
    setResult(null); setError(""); setBusy(false);
  }
  return <div className="calculator-panel-shell" data-pd-id="calculators.multi-lay.presentation"><div className="calculator-shell">
    <div className="calculator-band calculator-band-primary"><div className="calculator-segment calculator-segment-back"><CalculatorSegmentEyebrow>Back bet</CalculatorSegmentEyebrow><div className="calculator-segment-grid calculator-segment-grid-back"><Field error={null} id="multi-back-stake" label="Back stake" onChange={(value) => update({ ...inputs, backStake: value })} value={inputs.backStake} /><Field error={getSportsbookOddsInputError(inputs.backOdds, { required: false })} id="multi-back-odds" label="Back odds" onBlur={() => { const normalized = normalizeCalculatorOddsInput(inputs.backOdds); if (normalized.converted) update({ ...inputs, backOdds: normalized.canonicalValue }); }} onChange={(value) => update({ ...inputs, backOdds: value })} value={inputs.backOdds} /></div></div></div>
    <div className="calculator-band calculator-band-primary calculator-band-single calculator-band-multilay">
      <div className="calculator-panel-card calculator-panel-card-multilay">
        <div className="multi-lay-calculator-title-row"><span className="eyebrow">Multi-Lay Calculator</span></div>
        <div className="stack">
          <div className="multi-lay-planner-toolbar">
            <button aria-checked={inputs.allocation === "underlay"} className={`material-switch${inputs.allocation === "underlay" ? " is-selected" : ""}`} onClick={() => update({ ...inputs, allocation: inputs.allocation === "underlay" ? "standard" : "underlay" })} role="switch" type="button"><span aria-hidden="true" className="material-switch-track"><span className="material-switch-thumb" /></span><span>Underlay</span></button>
            <SelectField id="multi-exchange" label="Exchange" value={inputs.exchange} onChange={(value) => { const selected = exchanges.find((option) => option.name === value); update({ ...inputs, exchange: value, commission: selected?.default_commission_rate ?? "" }); }} options={(exchanges.length ? exchanges : [{ name: "Smarkets" }]).map((option) => [option.name, option.name] as const)} />
            <Field error={commissionError(inputs.commission)} id="multi-commission" label="Exchange commission" onChange={(value) => update({ ...inputs, commission: value })} value={inputs.commission} />
          </div>
          <div className="multi-lay-grid-wrap"><div className="multi-lay-table-heading">Outcome Table</div><table className={`data-table dense-calculator-grid multi-lay-reference-grid${inputs.outcomes.length > 2 ? " has-remove" : ""}`}><thead><tr><th>#</th><th>Outcome</th><th>Odds</th><th>{inputs.allocation === "underlay" ? "Underlay Stake" : "Lay Stake"}</th><th>Liability</th>{inputs.outcomes.length > 2 ? <th>Remove</th> : null}</tr></thead><tbody>
            {inputs.outcomes.map((outcome, index) => { const branch = result?.branches[index]; return <tr data-pd-id={`calculators.multi-lay.outcome-${index + 1}`} key={index}>
              <td data-label="#">{index + 1}</td><td data-label="Outcome"><label className="field-control"><span className="sr-only">Outcome {index + 1} name</span><input aria-invalid={!outcome.label.trim()} data-pd-id={`calculators.multi-outcome-${index + 1}-label`} onChange={(event) => updateOutcome(index, "label", event.target.value)} value={outcome.label} /></label></td>
              <td data-label="Odds"><label className="field-control"><span className="sr-only">Outcome {index + 1} lay odds</span><input aria-invalid={Boolean(getSportsbookOddsInputError(outcome.layOdds, { required: false }))} data-pd-id={`calculators.multi-outcome-${index + 1}-odds`} inputMode="decimal" onBlur={() => normalizeOutcome(index)} onChange={(event) => updateOutcome(index, "layOdds", event.target.value)} value={outcome.layOdds} /></label></td>
              <td data-label={inputs.allocation === "underlay" ? "Underlay Stake" : "Lay Stake"}><CopyableFinancialValue dataPdId={`calculators.multi-lay.outcome-${index + 1}.copyable`} label={`${outcome.label || `Outcome ${index + 1}`} lay stake`} value={branch?.lay_stake} /></td><td data-label="Liability">{branch ? <FinancialValue label={`${branch.label} liability`} tone="inherit" value={branch.liability} /> : <span>£ -</span>}</td>
              {inputs.outcomes.length > 2 ? <td data-label="Remove">{index >= 2 ? <button aria-label={`Remove ${outcome.label || `outcome ${index + 1}`}`} className="icon-button icon-button-destructive multi-lay-action-button" onClick={() => update({ ...inputs, outcomes: inputs.outcomes.filter((_, at) => at !== index) })} type="button"><span aria-hidden="true" className="material-symbols-outlined">delete</span></button> : null}</td> : null}
            </tr>; })}
          </tbody></table></div>
          <div className="tracker-nav multi-lay-add-row"><button className="button-link" disabled={inputs.outcomes.length >= 3} onClick={() => update({ ...inputs, outcomes: [...inputs.outcomes, { label: `Outcome ${inputs.outcomes.length + 1}`, layOdds: "" }] })} type="button">Add outcome</button></div>
          {result ? <CalculatorOutcomes inspectionId="calculators.multi-lay.outcomes" rows={[...result.branches.map((branch, index) => ({ key: `branch-${index}`, label: branch.label, tone: index === 0 ? "primary" as const : "exchange" as const, total: branch.outcome_value })), { key: "no-selection", label: "No selection wins", tone: "neutral", total: result.no_selection_value }]} summary={<><span>Total liability <CalculatorOutcomeValueDisplay label="Total liability" value={result.total_liability} /></span><span>Matched result <CalculatorOutcomeValueDisplay label="Matched result" value={result.matched_result} /></span></>} /> : null}
          {busy ? <p className="field-hint" role="status">Updating outcomes…</p> : null}
          {error ? <p className="error-text" role="alert">{error}</p> : null}
          <div className="tracker-nav"><button className="button-link icon-text-action" data-pd-id="calculators.multi-lay.reset" onClick={resetCalculator} type="button"><span aria-hidden="true" className="material-symbols-outlined">restart_alt</span><span>Reset</span></button>{result ? <button className="modal-primary-button icon-text-action" data-pd-id="calculators.multi-lay.convert" onClick={() => { setConversionReceipt([]); setConversionOpen(true); }} type="button"><span aria-hidden="true" className="material-symbols-outlined">move_item</span><span>Convert to opportunity</span></button> : null}</div>
          {conversionReceipt.length ? <section className="calculator-conversion-receipt" role="status"><strong>Opportunity saved</strong>{conversionReceipt.map((item) => <span key={`${item.profile}:${item.href}`}>{item.profile} · {item.account} · Sportsbook {item.href ? <Link href={item.href}>Open row</Link> : null}</span>)}</section> : null}
        </div>
      </div>
    </div>
    {conversionOpen && result ? <CalculatorConversionDialog financial={{ kind: "multi-lay", envelope: { calculator_family: "multi-lay", calculator_version: "multi-lay-v1", calculator_mode: inputs.allocation, canonical_inputs: { ...inputs }, created_at: conversionCreatedAt }, calculator: { allocation: inputs.allocation, back_stake: inputs.backStake, back_odds: inputs.backOdds, exchange_commission: inputs.commission, outcomes: inputs.outcomes.map((outcome) => ({ label: outcome.label, lay_odds: outcome.layOdds })) } }} onClose={() => setConversionOpen(false)} onComplete={setConversionReceipt} /> : null}
  </div></div>;
}

type SequentialLayInputs = {
  mode: "standard" | "lock_in";
  backStake: string;
  backOdds: string;
  backCommission: string;
  legs: Array<{ exchange: string; layOdds: string; commission: string }>;
};
type SequentialLayResult = {
  mode: SequentialLayInputs["mode"];
  legs: Array<{ lay_odds: string; commission: string; lay_stake: string; liability: string; lay_win: string }>;
  outcomes: Array<{ key: string; label: string; bookmaker_component: string; exchange_components: string[]; total: string }>;
  all_legs_win: string;
  locked_result: string | null;
};

function sequentialLayDefaults(exchanges: ExchangeOption[]): SequentialLayInputs {
  const smarkets = exchanges.find((option) => option.name === "Smarkets");
  const exchange = smarkets?.name ?? "Smarkets";
  const commission = smarkets?.default_commission_rate ?? "0";
  return { mode: "standard", backStake: "", backOdds: "", backCommission: "0", legs: [{ exchange, layOdds: "", commission }, { exchange, layOdds: "", commission }] };
}

function readSequentialLay(search: URLSearchParams): SequentialLayInputs {
  try {
    const parsed = JSON.parse(search.get("sequentialLay") ?? "null") as SequentialLayInputs | null;
    return parsed && Array.isArray(parsed.legs) && parsed.legs.length >= 2 ? parsed : sequentialLayDefaults([]);
  } catch { return sequentialLayDefaults([]); }
}

function SequentialLayCalculator({ exchanges, onState, search }: { exchanges: ExchangeOption[]; onState: (params: URLSearchParams) => void; search: URLSearchParams }) {
  const [inputs, setInputs] = useState<SequentialLayInputs>(() => readSequentialLay(search));
  const [result, setResult] = useState<SequentialLayResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const requestVersion = useRef(0);
  const requestAbort = useRef<AbortController | null>(null);
  const invalid = !isPositiveAmount(inputs.backStake) || Boolean(getSportsbookOddsInputError(inputs.backOdds, { required: true })) || commissionError(inputs.backCommission) !== null || inputs.legs.some((leg) => Boolean(getSportsbookOddsInputError(leg.layOdds, { required: true })) || commissionError(leg.commission) !== null || Number(leg.commission) >= 1);
  const serialized = JSON.stringify(inputs);
  useEffect(() => { onState(new URLSearchParams({ family: "sequential-lay", sequentialLay: serialized })); }, [serialized, onState]);
  function update(next: SequentialLayInputs) { requestAbort.current?.abort(); requestVersion.current += 1; setInputs(next); setResult(null); setError(""); setBusy(false); }
  function updateLeg(index: number, patch: Partial<SequentialLayInputs["legs"][number]>) { update({ ...inputs, legs: inputs.legs.map((leg, at) => at === index ? { ...leg, ...patch } : leg) }); }
  async function calculate() {
    if (invalid) return;
    const version = ++requestVersion.current; const controller = new AbortController(); requestAbort.current = controller; setBusy(true); setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/fund-manager/calculators/sequential-lay/preview`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ mode: inputs.mode, back_stake: inputs.backStake, back_odds: inputs.backOdds, back_commission: inputs.backCommission, legs: inputs.legs.map((leg) => ({ lay_odds: leg.layOdds, commission: leg.commission })) }) });
      if (!response.ok) throw new Error(formatApiErrorBody(await response.text(), "Unable to calculate Sequential Lay."));
      const next = await response.json() as SequentialLayResult; if (version === requestVersion.current) setResult(next);
    } catch (caught) { if (version === requestVersion.current && !(caught instanceof DOMException && caught.name === "AbortError")) setError(caught instanceof Error ? caught.message : "Unable to calculate Sequential Lay."); }
    finally { if (version === requestVersion.current) setBusy(false); }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (invalid) { requestAbort.current?.abort(); return; } const timer = window.setTimeout(() => { void calculate(); }, 120); return () => window.clearTimeout(timer); }, [serialized, invalid]);
  useEffect(() => () => requestAbort.current?.abort(), []);
  function normalizeBack() { const normalized = normalizeCalculatorOddsInput(inputs.backOdds); if (normalized.converted) update({ ...inputs, backOdds: normalized.canonicalValue }); }
  function normalizeLeg(index: number) { const normalized = normalizeCalculatorOddsInput(inputs.legs[index].layOdds); if (normalized.converted) updateLeg(index, { layOdds: normalized.canonicalValue }); }
  function resetCalculator() { requestAbort.current?.abort(); requestVersion.current += 1; setInputs(sequentialLayDefaults(exchanges)); setResult(null); setError(""); setBusy(false); }
  return <div className="calculator-panel-shell" data-pd-id="calculators.sequential-lay.presentation"><div className="calculator-shell">
    <div className="calculator-band calculator-band-primary stack">
      <div className="ledger-calculator-mode-bar"><SelectField id="sequential-mode" label="Mode" value={inputs.mode} onChange={(mode) => update({ ...inputs, mode: mode as SequentialLayInputs["mode"] })} options={[["standard", "Standard"], ["lock_in", "Lock In"]]} /></div>
      <div className="calculator-segment calculator-segment-back"><CalculatorSegmentEyebrow>Back bet</CalculatorSegmentEyebrow><div className="calculator-segment-grid calculator-segment-grid-back">
        <Field error={null} id="sequential-back-stake" label="Back stake" onChange={(backStake) => update({ ...inputs, backStake })} value={inputs.backStake} />
        <Field error={getSportsbookOddsInputError(inputs.backOdds, { required: false })} id="sequential-back-odds" label="Back odds" onBlur={normalizeBack} onChange={(backOdds) => update({ ...inputs, backOdds })} value={inputs.backOdds} />
        <Field error={commissionError(inputs.backCommission)} id="sequential-back-commission" label="Back commission" onChange={(backCommission) => update({ ...inputs, backCommission })} value={inputs.backCommission} />
      </div></div>
    </div>
    <div className="calculator-band calculator-band-primary calculator-band-single calculator-band-multilay"><div className="calculator-panel-card calculator-panel-card-multilay"><div className="multi-lay-calculator-title-row"><span className="eyebrow">Sequential Lay legs</span></div><div className="stack">
      <div className="multi-lay-grid-wrap"><table className={`data-table dense-calculator-grid sequential-lay-grid${inputs.legs.length > 2 ? " has-remove" : ""}`}><thead><tr><th>Leg</th><th>Exchange</th><th>Lay odds</th><th>Commission</th><th>Lay stake</th><th>Liability</th>{inputs.legs.length > 2 ? <th>Remove</th> : null}</tr></thead><tbody>{inputs.legs.map((leg, index) => { const calculated = result?.legs[index]; return <tr data-pd-id={`calculators.sequential-lay.leg-${index + 1}`} key={index}>
        <td data-label="Leg"><strong>Leg {index + 1}</strong><br /><span aria-label={index === 0 ? "Current leg" : index === 1 ? "Next if leg 1 wins" : "Not yet calculable; prior legs must win"} className="field-hint">{index === 0 ? "Current" : index === 1 ? "Next" : "Not yet"}</span></td>
        <td data-label="Exchange"><label className="field-control"><span className="sr-only">Leg {index + 1} exchange</span><select aria-label={`Leg ${index + 1} exchange`} value={leg.exchange} onChange={(event) => { const selected = exchanges.find((option) => option.name === event.target.value); updateLeg(index, { exchange: event.target.value, commission: selected?.default_commission_rate ?? "" }); }}>{(exchanges.length ? exchanges : [{ name: "Smarkets" }]).map((option) => <option key={option.name}>{option.name}</option>)}</select></label></td>
        <td data-label="Lay odds"><label className="field-control"><span className="sr-only">Leg {index + 1} lay odds</span><input aria-invalid={Boolean(getSportsbookOddsInputError(leg.layOdds, { required: false }))} data-pd-id={`calculators.sequential-lay.leg-${index + 1}-odds`} inputMode="decimal" onBlur={() => normalizeLeg(index)} onChange={(event) => updateLeg(index, { layOdds: event.target.value })} value={leg.layOdds} /></label></td>
        <td data-label="Commission"><label className="field-control"><span className="sr-only">Leg {index + 1} commission</span><input aria-label={`Leg ${index + 1} commission`} inputMode="decimal" onChange={(event) => updateLeg(index, { commission: event.target.value })} value={leg.commission} /></label></td>
        <td data-label="Lay stake"><CopyableFinancialValue dataPdId={`calculators.sequential-lay.leg-${index + 1}.copyable`} label={`Leg ${index + 1} lay stake`} value={calculated?.lay_stake} /></td><td data-label="Liability">{calculated ? <FinancialValue label={`Leg ${index + 1} liability`} tone="inherit" value={calculated.liability} /> : <span>£ -</span>}</td>
        {inputs.legs.length > 2 ? <td data-label="Remove"><button aria-label={`Remove leg ${index + 1}`} className="icon-button icon-button-destructive multi-lay-action-button" onClick={() => update({ ...inputs, legs: inputs.legs.filter((_, at) => at !== index) })} type="button"><span aria-hidden="true" className="material-symbols-outlined">delete</span></button></td> : null}
      </tr>; })}</tbody></table></div>
      <div className="tracker-nav multi-lay-add-row"><button className="button-link" onClick={() => { const defaults = sequentialLayDefaults(exchanges).legs[0]; update({ ...inputs, legs: [...inputs.legs, defaults] }); }} type="button">Add leg</button></div>
      {result ? <CalculatorOutcomes columns={["Bookmaker", "Exchange legs"]} inspectionId="calculators.sequential-lay.outcomes" rows={result.outcomes.map((outcome, index) => ({ key: outcome.key, label: outcome.label, tone: index === result.outcomes.length - 1 ? "positive" as const : "exchange" as const, components: [[outcome.bookmaker_component], outcome.exchange_components], total: outcome.total }))} summary={result.locked_result !== null ? <span>Locked result <CalculatorOutcomeValueDisplay label="Locked result" value={result.locked_result} /></span> : <span>All legs win <CalculatorOutcomeValueDisplay label="All legs win" value={result.all_legs_win} /></span>} /> : null}
      {busy ? <p className="field-hint" role="status">Updating outcomes…</p> : null}{error ? <p className="error-text" role="alert">{error}</p> : null}
      <div className="tracker-nav"><button className="button-link icon-text-action" data-pd-id="calculators.sequential-lay.reset" onClick={resetCalculator} type="button"><span aria-hidden="true" className="material-symbols-outlined">restart_alt</span><span>Reset</span></button></div>
    </div></div></div>
  </div></div>;
}

type EarlyPayoutInputs = {
  coverMode: "exchange_lay" | "two_way_dutch";
  backStake: string;
  backOdds: string;
  exchange: string;
  layOdds: string;
  commission: string;
  actualInitialStake: string;
  triggered: boolean;
  maximumPayout: string;
  inPlayBackOdds: string;
  lockAdjustmentPercent: string;
  partBacks: Array<{ stake: string; odds: string }>;
};
type EarlyPayoutResult = {
  cover_mode: EarlyPayoutInputs["coverMode"];
  triggered: boolean;
  recommended_initial_stake: string;
  actual_initial_stake: string;
  liability: string | null;
  recommended_additional_back_stake: string | null;
  current_value: string;
  outcomes: Array<{ key: string; label: string; components: string[]; total: string }>;
};

function earlyPayoutDefaults(exchanges: ExchangeOption[]): EarlyPayoutInputs {
  const smarkets = exchanges.find((option) => option.name === "Smarkets");
  return { coverMode: "exchange_lay", backStake: "", backOdds: "", exchange: smarkets?.name ?? "Smarkets", layOdds: "", commission: smarkets?.default_commission_rate ?? "0", actualInitialStake: "", triggered: false, maximumPayout: "", inPlayBackOdds: "", lockAdjustmentPercent: "100", partBacks: [] };
}

function readEarlyPayout(search: URLSearchParams): EarlyPayoutInputs {
  try {
    const parsed = JSON.parse(search.get("earlyPayout") ?? "null") as EarlyPayoutInputs | null;
    return parsed && ["exchange_lay", "two_way_dutch"].includes(parsed.coverMode) && Array.isArray(parsed.partBacks) ? parsed : earlyPayoutDefaults([]);
  } catch { return earlyPayoutDefaults([]); }
}

function EarlyPayoutCalculator({ exchanges, onState, search }: { exchanges: ExchangeOption[]; onState: (params: URLSearchParams) => void; search: URLSearchParams }) {
  const [inputs, setInputs] = useState<EarlyPayoutInputs>(() => readEarlyPayout(search));
  const [result, setResult] = useState<EarlyPayoutResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const requestVersion = useRef(0);
  const requestAbort = useRef<AbortController | null>(null);
  const initialOdds = inputs.coverMode === "exchange_lay" ? inputs.layOdds : inputs.layOdds;
  const invalid = !isPositiveAmount(inputs.backStake)
    || Boolean(getSportsbookOddsInputError(inputs.backOdds, { required: true }))
    || Boolean(getSportsbookOddsInputError(initialOdds, { required: true }))
    || (inputs.coverMode === "exchange_lay" && (commissionError(inputs.commission) !== null || Number(inputs.commission) >= 1))
    || Boolean(inputs.actualInitialStake && !isPositiveAmount(inputs.actualInitialStake))
    || Boolean(inputs.maximumPayout && !isPositiveAmount(inputs.maximumPayout))
    || (inputs.triggered && Boolean(getSportsbookOddsInputError(inputs.inPlayBackOdds, { required: true })))
    || !hasCompleteDecimalInputSyntax(inputs.lockAdjustmentPercent)
    || Number(inputs.lockAdjustmentPercent) < 0 || Number(inputs.lockAdjustmentPercent) > 150
    || inputs.partBacks.some((part) => !isPositiveAmount(part.stake) || Boolean(getSportsbookOddsInputError(part.odds, { required: true })));
  const serialized = JSON.stringify(inputs);
  useEffect(() => { onState(new URLSearchParams({ family: "early-payout", earlyPayout: serialized })); }, [serialized, onState]);
  function update(patch: Partial<EarlyPayoutInputs>, preserveResult = false) { requestAbort.current?.abort(); requestVersion.current += 1; setInputs((current) => ({ ...current, ...patch })); if (!preserveResult) setResult(null); setError(""); setBusy(false); }
  function updatePart(index: number, patch: Partial<EarlyPayoutInputs["partBacks"][number]>) { update({ partBacks: inputs.partBacks.map((part, at) => at === index ? { ...part, ...patch } : part) }); }
  function normalize(field: "backOdds" | "layOdds" | "inPlayBackOdds") { const normalized = normalizeCalculatorOddsInput(inputs[field]); if (normalized.converted) update({ [field]: normalized.canonicalValue }); }
  function normalizePart(index: number) { const normalized = normalizeCalculatorOddsInput(inputs.partBacks[index].odds); if (normalized.converted) updatePart(index, { odds: normalized.canonicalValue }); }
  async function calculate() {
    if (invalid) return;
    const version = ++requestVersion.current; const controller = new AbortController(); requestAbort.current = controller; setBusy(true); setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/fund-manager/calculators/early-payout/preview`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ cover_mode: inputs.coverMode, back_stake: inputs.backStake, back_odds: inputs.backOdds, triggered: inputs.triggered, lay_odds: inputs.coverMode === "exchange_lay" ? inputs.layOdds : "", lay_commission: inputs.coverMode === "exchange_lay" ? inputs.commission : "0", actual_lay_stake: inputs.coverMode === "exchange_lay" ? inputs.actualInitialStake : "", second_back_odds: inputs.coverMode === "two_way_dutch" ? inputs.layOdds : "", actual_second_back_stake: inputs.coverMode === "two_way_dutch" ? inputs.actualInitialStake : "", maximum_payout: inputs.maximumPayout, in_play_back_odds: inputs.inPlayBackOdds, lock_adjustment_percent: inputs.lockAdjustmentPercent, part_backs: inputs.partBacks }) });
      if (!response.ok) throw new Error(formatApiErrorBody(await response.text(), "Unable to calculate Early Payout."));
      const next = await response.json() as EarlyPayoutResult; if (version === requestVersion.current) setResult(next);
    } catch (caught) { if (version === requestVersion.current && !(caught instanceof DOMException && caught.name === "AbortError")) setError(caught instanceof Error ? caught.message : "Unable to calculate Early Payout."); }
    finally { if (version === requestVersion.current) setBusy(false); }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (invalid) { requestAbort.current?.abort(); return; } const timer = window.setTimeout(() => { void calculate(); }, 120); return () => window.clearTimeout(timer); }, [serialized, invalid]);
  useEffect(() => () => requestAbort.current?.abort(), []);
  function resetCalculator() { requestAbort.current?.abort(); requestVersion.current += 1; setInputs(earlyPayoutDefaults(exchanges)); setResult(null); setError(""); setBusy(false); }
  const columns = inputs.coverMode === "exchange_lay" ? ["Bookmaker", "Exchange"] : ["Bookmaker 1", "Bookmaker 2", "Bookmaker 3"];
  const lockAdjustmentReady = inputs.triggered && !invalid;
  const referenceRows = [
    { label: inputs.coverMode === "exchange_lay" ? "Recommended lay stake" : "Recommended second bookmaker stake", value: result?.recommended_initial_stake },
    ...(result && result.actual_initial_stake !== result.recommended_initial_stake ? [{ label: inputs.coverMode === "exchange_lay" ? "Actual lay stake" : "Actual second bookmaker stake", value: result.actual_initial_stake }] : []),
    { label: "Liability", value: result?.liability },
    { copyable: true, label: "Additional back stake", value: result?.recommended_additional_back_stake },
    { label: "Current value", value: result?.current_value },
  ];
  const placeholderOutcomes = inputs.coverMode === "exchange_lay"
    ? ["Team / selection wins", "Draw / middle outcome", "Team / selection loses"]
    : ["Selection wins", "Other selection wins"];
  const displayedOutcomes = result?.outcomes ?? placeholderOutcomes.map((label, index) => ({ key: `pending-${index}`, label, components: columns.map(() => ""), total: "" }));
  return <div className="calculator-panel-shell" data-pd-id="calculators.early-payout.presentation"><div className="calculator-shell">
    <div className="calculator-band calculator-band-primary stack">
      <div className="ledger-calculator-mode-bar">
        <SelectField id="early-cover-mode" label="Matching mode" value={inputs.coverMode} onChange={(value) => update({ coverMode: value as EarlyPayoutInputs["coverMode"], actualInitialStake: "", commission: value === "two_way_dutch" ? "0" : inputs.commission })} options={[["exchange_lay", "Exchange Lay"], ["two_way_dutch", "2-Way Dutch"]]} />
        {inputs.coverMode === "exchange_lay" ? <SelectField id="early-exchange" label="Exchange" value={inputs.exchange} onChange={(value) => { const selected = exchanges.find((option) => option.name === value); update({ exchange: value, commission: selected?.default_commission_rate ?? "" }); }} options={(exchanges.length ? exchanges : [{ name: "Smarkets" }]).map((option) => [option.name, option.name] as const)} /> : null}
        <button aria-checked={inputs.triggered} className={`material-switch${inputs.triggered ? " is-selected" : ""}`} data-pd-id="calculators.early-payout.triggered" onClick={() => update({ triggered: !inputs.triggered, inPlayBackOdds: "", maximumPayout: "", lockAdjustmentPercent: "100", partBacks: [] })} role="switch" type="button"><span aria-hidden="true" className="material-switch-track"><span className="material-switch-thumb" /></span><span>Bookmaker has paid out early</span></button>
      </div>
      <div className="form-grid calculator-paired-segments calculator-paired-rows-3" data-pd-id="calculators.early-payout.paired-segments">
        <section className="calculator-segment calculator-segment-back calculator-paired-segment" style={{ "--calculator-segment-field-rows": 2, "--calculator-segment-span": 3 } as CSSProperties}><CalculatorSegmentEyebrow>Back bet</CalculatorSegmentEyebrow><div className="calculator-segment-grid calculator-paired-segment-fields"><Field error={null} id="early-back-stake" label="Back stake" onChange={(backStake) => update({ backStake })} value={inputs.backStake} /><Field error={getSportsbookOddsInputError(inputs.backOdds, { required: false })} id="early-back-odds" label="Back odds" onBlur={() => normalize("backOdds")} onChange={(backOdds) => update({ backOdds })} value={inputs.backOdds} /></div></section>
        <section className="calculator-segment calculator-segment-lay calculator-paired-segment" style={{ "--calculator-segment-field-rows": 2, "--calculator-segment-span": inputs.coverMode === "exchange_lay" ? 4 : 3 } as CSSProperties}><CalculatorSegmentEyebrow>{inputs.coverMode === "exchange_lay" ? "Lay bet" : "Bookmaker 2"}</CalculatorSegmentEyebrow><div className="calculator-segment-grid calculator-paired-segment-fields"><Field error={getSportsbookOddsInputError(inputs.layOdds, { required: false })} id="early-initial-odds" label={inputs.coverMode === "exchange_lay" ? "Lay odds" : "Second bookmaker odds"} onBlur={() => normalize("layOdds")} onChange={(layOdds) => update({ layOdds })} value={inputs.layOdds} /><Field error={null} id="early-actual-initial-stake" label={inputs.coverMode === "exchange_lay" ? "Actual lay stake (optional)" : "Actual second stake (optional)"} onChange={(actualInitialStake) => update({ actualInitialStake })} value={inputs.actualInitialStake} /></div>{inputs.coverMode === "exchange_lay" ? <div className="calculator-segment-grid calculator-segment-auxiliary-fields"><Field error={commissionError(inputs.commission)} id="early-commission" label="Exchange commission" onChange={(commission) => update({ commission })} value={inputs.commission} /></div> : null}</section>
      </div>
      {inputs.triggered ? <section className="calculator-panel-card stack" data-pd-id="calculators.early-payout.lock-in"><div className="calculator-segment-heading"><span className="eyebrow">Lock in after payout</span></div><div className="form-grid"><Field error={getSportsbookOddsInputError(inputs.inPlayBackOdds, { required: false })} id="early-in-play-odds" label="In-play back odds" onBlur={() => normalize("inPlayBackOdds")} onChange={(inPlayBackOdds) => update({ inPlayBackOdds })} value={inputs.inPlayBackOdds} /><Field error={null} id="early-maximum-payout" label="Maximum payout (optional)" onChange={(maximumPayout) => update({ maximumPayout })} value={inputs.maximumPayout} /></div><div className="calculator-slider-heading"><label className="field-control" htmlFor="calculator-early-lock-adjustment"><span>Lock-in adjustment: {inputs.lockAdjustmentPercent}%</span></label><button className="button-link compact-action" data-pd-id="calculators.early-payout.lock-adjustment-reset" disabled={!inputs.triggered || inputs.lockAdjustmentPercent === "100"} onClick={() => update({ lockAdjustmentPercent: "100" }, true)} type="button">Reset</button></div><input aria-describedby="calculator-early-lock-adjustment-guidance" aria-label="Lock-in adjustment" className="custom-slider-track" data-pd-id="calculators.early-lock-adjustment" disabled={!lockAdjustmentReady} id="calculator-early-lock-adjustment" max="150" min="0" onChange={(event) => update({ lockAdjustmentPercent: event.target.value }, true)} step="1" type="range" value={inputs.lockAdjustmentPercent} /><p className="field-hint" id="calculator-early-lock-adjustment-guidance">Shift the suggested hedge toward more or less profit on the remaining outcome.</p><div className="custom-slider-direction-labels" aria-hidden="true"><span>Conservative</span><span>Equalised</span><span>Aggressive</span></div>
        <div className="multi-lay-grid-wrap"><table className="data-table multi-lay-planner-grid"><thead><tr><th>Part back</th><th>Stake</th><th>Odds</th><th>Action</th></tr></thead><tbody>{inputs.partBacks.map((part, index) => <tr key={index}><td>Part {index + 1}</td><td><label className="field-control"><span className="sr-only">Part back {index + 1} stake</span><input inputMode="decimal" onChange={(event) => updatePart(index, { stake: event.target.value })} value={part.stake} /></label></td><td><label className="field-control"><span className="sr-only">Part back {index + 1} odds</span><input inputMode="decimal" onBlur={() => normalizePart(index)} onChange={(event) => updatePart(index, { odds: event.target.value })} value={part.odds} /></label></td><td><button aria-label={`Remove part back ${index + 1}`} className="icon-button icon-button-destructive multi-lay-action-button" onClick={() => update({ partBacks: inputs.partBacks.filter((_, at) => at !== index) })} type="button"><span aria-hidden="true" className="material-symbols-outlined">delete</span></button></td></tr>)}</tbody></table></div><div className="tracker-nav multi-lay-add-row"><button className="button-link" onClick={() => update({ partBacks: [...inputs.partBacks, { stake: "", odds: "" }] })} type="button">Add part back</button></div>
      </section> : null}
      {(result || inputs.triggered) ? <div className="calculator-band calculator-band-secondary calculator-result-peers" data-pd-id="calculators.early-payout.result-sections"><CalculatorReferenceSection busy={busy} description={inputs.triggered ? "Reference values after the bookmaker has paid early. Adjust the hedge before placing an additional bet." : "Shows the initial hedge before the early-payout trigger is reached."} inspectionId="calculators.early-payout.reference" live={inputs.triggered} rows={referenceRows} title={inputs.triggered ? "Lock-In Reference" : "Initial Matching Reference"} /><CalculatorOutcomes columns={columns} description="Shows the projected result for each possible final outcome." inspectionId="calculators.early-payout.outcomes" rows={displayedOutcomes.map((outcome, index) => ({ key: outcome.key, label: outcome.label, tone: index === 0 ? "positive" as const : "exchange" as const, components: outcome.components.map((component) => [component]), total: outcome.total }))} summary={result ? <span>Conservative current value <CalculatorOutcomeValueDisplay label="Conservative current value" value={result.current_value} /></span> : undefined} /></div> : null}
      {busy ? <p className="field-hint" role="status">Updating outcomes…</p> : null}{error ? <p className="error-text" role="alert">{error}</p> : null}<div className="tracker-nav"><button className="button-link icon-text-action" data-pd-id="calculators.early-payout.reset" onClick={resetCalculator} type="button"><span aria-hidden="true" className="material-symbols-outlined">restart_alt</span><span>Reset</span></button></div>
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
const eachWayDefaults: EachWayInputs = { mode: "Extra Place", stake: "", backOdds: "", term: "5", bookmakerPlaces: "4", exchangePlaces: "3", exchange: "Smarkets", winLayOdds: "", placeLayOdds: "", winCommission: "0", placeCommission: "0" };
function readEachWay(search: URLSearchParams): EachWayInputs { try { return { ...eachWayDefaults, ...(JSON.parse(search.get("eachWay") ?? "null") ?? {}) }; } catch { return eachWayDefaults; } }
function EachWayCalculator({ exchanges, onState, search }: { exchanges: ExchangeOption[]; onState: (params: URLSearchParams) => void; search: URLSearchParams }) {
  const [inputs, setInputs] = useState<EachWayInputs>(() => readEachWay(search));
  const explicitColourScheme = search.get("eachWayPresentation");
  const [explicitColourSchemeOverride, setExplicitColourSchemeOverride] = useState<EachWayColourScheme | null>(() => explicitColourScheme ? resolveEachWayColourScheme(explicitColourScheme) : null);
  const { eachWayColourScheme, setEachWayColourScheme } = useTheme();
  const colourScheme = explicitColourSchemeOverride ?? eachWayColourScheme;
  const [result, setResult] = useState<EachWayResult | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const requestVersion = useRef(0); const requestAbort = useRef<AbortController | null>(null);
  const [conversionCreatedAt] = useState(() => new Date().toISOString());
  const [conversionOpen, setConversionOpen] = useState(false);
  const [conversionReceipt, setConversionReceipt] = useState<Array<{ profile: string; account: string; href: string; state: string }>>([]);
  const invalid = !isPositiveAmount(inputs.stake) || Boolean(getSportsbookOddsInputError(inputs.backOdds, { required: true })) || Boolean(getSportsbookOddsInputError(inputs.winLayOdds, { required: true })) || Boolean(getSportsbookOddsInputError(inputs.placeLayOdds, { required: true })) || !/^\d+$/.test(inputs.term) || Number(inputs.term) <= 0 || !/^\d+$/.test(inputs.bookmakerPlaces) || !/^\d+$/.test(inputs.exchangePlaces) || (inputs.mode === "Each Way" ? inputs.bookmakerPlaces !== inputs.exchangePlaces : Number(inputs.bookmakerPlaces) <= Number(inputs.exchangePlaces)) || commissionError(inputs.winCommission) !== null || commissionError(inputs.placeCommission) !== null;
  useEffect(() => { onState(new URLSearchParams({ family: "each-way", eachWay: JSON.stringify(inputs), eachWayPresentation: colourScheme })); }, [colourScheme, inputs, onState]);
  function updateColourScheme(next: EachWayColourScheme) {
    setExplicitColourSchemeOverride(null);
    setEachWayColourScheme(next);
  }
  function update(patch: Partial<EachWayInputs>) { requestAbort.current?.abort(); requestVersion.current += 1; setInputs((current) => ({ ...current, ...patch })); setResult(null); setError(""); setBusy(false); }
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
  function resetCalculator() {
    requestAbort.current?.abort(); requestVersion.current += 1;
    const smarkets = exchanges.find((option) => option.name === "Smarkets");
    setInputs({ ...eachWayDefaults, exchange: smarkets?.name ?? "Smarkets", winCommission: smarkets?.default_commission_rate ?? "0", placeCommission: smarkets?.default_commission_rate ?? "0" });
    setResult(null); setError(""); setBusy(false);
  }
  const outcomes: EachWayOutcomeRow[] = [
    { key: "win", label: "First Place", bookmaker: [result?.first_place_bookie_win_pnl, result?.first_place_bookie_place_pnl], exchange: [result?.first_place_exchange_win_pnl, result?.first_place_exchange_place_pnl], total: result?.first_place_pnl, result: "Win" },
    { key: "standard", label: "Standard Place", bookmaker: [result?.standard_place_bookie_win_pnl, result?.standard_place_bookie_place_pnl], exchange: [result?.standard_place_exchange_win_pnl, result?.standard_place_exchange_place_pnl], total: result?.standard_place_pnl, result: "Standard Place" },
    ...(inputs.mode === "Extra Place" ? [{ key: "extra", label: "Extra Place", bookmaker: [result?.extra_place_bookie_win_pnl, result?.extra_place_bookie_place_pnl], exchange: [result?.extra_place_exchange_win_pnl, result?.extra_place_exchange_place_pnl], total: result?.extra_place_pnl, result: "Extra Place" }] : []),
    { key: "unplaced", label: "Doesn't Place", bookmaker: [result?.unplaced_bookie_win_pnl, result?.unplaced_bookie_place_pnl], exchange: [result?.unplaced_exchange_win_pnl, result?.unplaced_exchange_place_pnl], total: result?.unplaced_pnl, result: "Unplaced" },
  ];
  const stakeChoices = ["£ 2.50", "£ 5.00", "£ 10.00"];
  const termChoices = ["1/4", "1/5", "1/6"];
  const placeChoices = ["Paying 4 instead of 3", "Paying 5 instead of 4", "Paying 6 instead of 4", "Paying 6 instead of 5", "Paying 8 instead of 5", "Paying 10 instead of 8"];
  return <div className={`calculator-panel-shell extra-place-calculator-presentation extra-place-theme-${colourScheme}`} data-pd-id="calculators.each-way.presentation"><div className="calculator-shell"><div className="calculator-band calculator-band-primary stack">
    <div className="calculator-panel-control-row"><EachWayModeToggle mode={inputs.mode} onChange={switchMode} /><EachWayColourSchemeToggle onChange={updateColourScheme} value={colourScheme} /></div>
    <div className="ledger-calculator-mode-bar"><SelectField id="each-way-exchange" label="Exchange" value={inputs.exchange} onChange={(value) => { const selected = exchanges.find((option) => option.name === value); update({ exchange: value, winCommission: selected?.default_commission_rate ?? "", placeCommission: selected?.default_commission_rate ?? "" }); }} options={(exchanges.length ? exchanges : [{ name: "Smarkets" }]).map((option) => [option.name, option.name] as const)} /></div>
    <EachWayBackBetSection placeTerms={<EachWayPlaceTermsSection
      summary={inputs.mode === "Extra Place" ? `Paying ${inputs.bookmakerPlaces || "—"} instead of ${inputs.exchangePlaces || "—"}.` : `Paying ${inputs.bookmakerPlaces || "—"} places.`}
      quickChoices={<div className="extra-place-quick-choice-row"><QuickSelectRail ariaLabel="Place terms quick choices" choices={placeChoices.map((label) => ({ label, value: label }))} onSelect={(choice) => { const match = choice.match(/Paying (\d+) instead of (\d+)/); if (match) update({ bookmakerPlaces: match[1], exchangePlaces: match[2] }); }} selectedValues={[`Paying ${inputs.bookmakerPlaces} instead of ${inputs.exchangePlaces}`]} wrapLabels /></div>}
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
    <EachWayLaySection kind="win" label="Lay The Win" liability={result?.win_liability} stake={result?.win_lay_stake}>
      <Field error={getSportsbookOddsInputError(inputs.winLayOdds, { required: false })} id="each-way-win-lay-odds" label="Lay Odds" onBlur={() => normalize("winLayOdds")} onChange={(value) => update({ winLayOdds: value })} value={inputs.winLayOdds} />
      <Field error={commissionError(inputs.winCommission)} id="each-way-win-commission" label="Win Commission" onChange={(value) => update({ winCommission: value })} value={inputs.winCommission} />
    </EachWayLaySection>
    <EachWayLaySection kind="place" label="Lay The Place" liability={result?.place_liability} stake={result?.place_lay_stake}>
      <Field error={getSportsbookOddsInputError(inputs.placeLayOdds, { required: false })} id="each-way-place-lay-odds" label="Lay Odds" onBlur={() => normalize("placeLayOdds")} onChange={(value) => update({ placeLayOdds: value })} value={inputs.placeLayOdds} />
      <Field error={commissionError(inputs.placeCommission)} id="each-way-place-commission" label="Place Commission" onChange={(value) => update({ placeCommission: value })} value={inputs.placeCommission} />
    </EachWayLaySection>
    {busy ? <p className="field-hint" role="status">Updating outcomes…</p> : null}
    {error ? <p className="error-text" role="alert">{error}</p> : null}
    <div className="tracker-nav"><button className="button-link icon-text-action" data-pd-id="calculators.each-way.reset" onClick={resetCalculator} type="button"><span aria-hidden="true" className="material-symbols-outlined">restart_alt</span><span>Reset</span></button>{result ? <button className="modal-primary-button icon-text-action" data-pd-id="calculators.each-way.convert" onClick={() => { setConversionReceipt([]); setConversionOpen(true); }} type="button"><span aria-hidden="true" className="material-symbols-outlined">move_item</span><span>Convert to opportunity</span></button> : null}</div>
    {conversionReceipt.length ? <section className="calculator-conversion-receipt" role="status"><strong>Opportunity saved</strong>{conversionReceipt.map((item) => <span key={`${item.profile}:${item.href}`}>{item.profile} · {item.account} · Each Way / Extra Place {item.href ? <Link href={item.href}>Open row</Link> : null}</span>)}</section> : null}
    <EachWayOutcomeMatrix inspectionId="calculators.each-way.outcomes" outcomes={outcomes} qualifyingLoss={result?.qualifying_loss} selectedResult="" />
    {conversionOpen && result ? <CalculatorConversionDialog financial={{ kind: "each-way-extra-place", envelope: { calculator_family: "each-way", calculator_version: "each-way-extra-place-v1", calculator_mode: inputs.mode, canonical_inputs: { ...inputs }, created_at: conversionCreatedAt }, calculator: { mode: inputs.mode, each_way_stake: inputs.stake, back_odds: inputs.backOdds, place_term_numerator: "1", place_term_denominator: inputs.term, bookmaker_places: Number(inputs.bookmakerPlaces), exchange_places: Number(inputs.exchangePlaces), win_lay_odds: inputs.winLayOdds, place_lay_odds: inputs.placeLayOdds, win_commission: inputs.winCommission, place_commission: inputs.placeCommission } }} onClose={() => setConversionOpen(false)} onComplete={setConversionReceipt} /> : null}
  </div></div></div>;
}

type OddsProbabilitySource = "decimal" | "fractional" | "probability" | "american";
type OddsProbabilityResult = {
  result_kind: "reference";
  source: OddsProbabilitySource;
  decimal_odds: string;
  fractional_odds: string;
  american_odds: string;
  implied_probability: string;
};

function oddsProbabilityError(source: OddsProbabilitySource, value: string): string | null {
  if (!value) return "Enter a value to convert.";
  if (source === "fractional") {
    const match = /^([0-9]+)\/([0-9]+)$/.exec(value);
    return match && Number(match[1]) > 0 && Number(match[2]) > 0
      ? null
      : "Enter fractional odds as positive whole numbers, for example 5/2.";
  }
  if (source === "american") {
    if (!/^[+-]?[0-9]+(?:\.[0-9]+)?$/.test(value)) return "Enter American odds of at least +100 or at most -100.";
    const parsed = Number(value);
    return Number.isFinite(parsed) && Math.abs(parsed) >= 100 ? null : "Enter American odds of at least +100 or at most -100.";
  }
  const canonical = /^[0-9]+,[0-9]{1,2}$/.test(value) ? value.replace(",", ".") : value;
  if (!hasCompleteDecimalInputSyntax(canonical)) return `Enter complete ${source === "probability" ? "probability" : "decimal odds"} using digits and a full stop.`;
  const parsed = Number(canonical);
  if (source === "decimal" && parsed <= 1) return "Enter decimal odds greater than 1.";
  if (source === "probability" && (parsed <= 0 || parsed >= 100)) return "Enter probability above 0 and below 100.";
  return null;
}

function OddsProbabilityCalculator({ onState, search }: { onState: (params: URLSearchParams) => void; search: URLSearchParams }) {
  const requestedSource = search.get("oddsSource") as OddsProbabilitySource | null;
  const [source, setSource] = useState<OddsProbabilitySource>(requestedSource && ["decimal", "fractional", "probability", "american"].includes(requestedSource) ? requestedSource : "fractional");
  const [value, setValue] = useState(search.get("oddsValue") ?? "");
  const [result, setResult] = useState<OddsProbabilityResult | null>(null);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const requestVersion = useRef(0);
  const requestAbort = useRef<AbortController | null>(null);
  const validationError = oddsProbabilityError(source, value);

  useEffect(() => {
    onState(new URLSearchParams({ family: "odds-converter", oddsSource: source, oddsValue: value }));
  }, [onState, source, value]);

  useEffect(() => {
    requestAbort.current?.abort();
    const version = ++requestVersion.current;
    if (validationError) return;
    const controller = new AbortController(); requestAbort.current = controller;
    const timer = window.setTimeout(() => {
      void fetch(`${apiBaseUrl}/fund-manager/calculators/odds-probability/preview`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        signal: controller.signal, body: JSON.stringify({ source, value }),
      }).then(async (response) => {
        if (!response.ok) throw new Error(formatApiErrorBody(await response.text(), "Unable to convert odds."));
        const next = await response.json() as OddsProbabilityResult;
        if (version === requestVersion.current) { setResult(next); setError(""); }
      }).catch((caught) => {
        if (version === requestVersion.current && !(caught instanceof DOMException && caught.name === "AbortError")) {
          setResult(null); setError(caught instanceof Error ? caught.message : "Unable to convert odds.");
        }
      });
    }, 120);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [source, value, validationError]);

  function reset() {
    requestAbort.current?.abort(); requestAbort.current = null; requestVersion.current += 1;
    setSource("fractional"); setValue(""); setResult(null); setError(""); setTouched(false);
  }

  function normalizeDecimalComma() {
    if ((source === "decimal" || source === "probability") && /^[0-9]+,[0-9]{1,2}$/.test(value)) {
      setValue(value.replace(",", "."));
    }
  }

  return <div className="calculator-panel-shell" data-pd-id="calculators.odds-probability">
    <div className="calculator-shell">
      <div className="calculator-band calculator-band-primary">
        <div className="ledger-calculator-mode-bar">
          <SelectField id="odds-probability-source" label="Source format" onChange={(next) => { requestAbort.current?.abort(); setSource(next as OddsProbabilitySource); setValue(""); setResult(null); setError(""); setTouched(false); }} options={[["decimal", "Decimal odds"], ["fractional", "Fractional odds"], ["probability", "Implied probability"], ["american", "American odds"]]} value={source} />
        </div>
        <div className="calculator-segment calculator-segment-back">
          <div className="calculator-segment-heading"><span className="eyebrow">Convert</span></div>
          <div className="calculator-segment-grid calculator-segment-grid-back">
            <Field error={touched ? validationError : null} id="odds-probability-value" inputMode={source === "fractional" || source === "american" ? "text" : "decimal"} label={source === "probability" ? "Probability (%)" : source === "american" ? "American odds" : source === "fractional" ? "Fractional odds" : "Decimal odds"} onBlur={() => { setTouched(true); normalizeDecimalComma(); }} onChange={(next) => { requestAbort.current?.abort(); setValue(next); setResult(null); setError(""); }} value={value} />
          </div>
        </div>
        <p className="field-hint">Implied probability is an odds conversion, not a prediction.</p>
        {error ? <p className="error-text" role="alert">{error}</p> : null}
        <div className="tracker-nav"><button className="button-link icon-text-action" data-pd-id="calculators.odds-probability.reset" onClick={reset} type="button"><span aria-hidden="true" className="material-symbols-outlined">restart_alt</span><span>Reset</span></button></div>
      </div>
      {result ? <div className="calculator-band calculator-band-secondary" data-pd-id="calculators.odds-probability.results">
        <div className="calculator-panel-card calculator-result-panel"><article className="calculator-result-card">
          <div className="calculator-result-card-heading"><strong>Converted reference</strong></div>
          <dl className="calculator-result-card-values">
            <ResultValue label="Decimal odds" money={false} value={result.decimal_odds} />
            <ResultValue label="Fractional odds" money={false} value={result.fractional_odds} />
            <ResultValue label="American odds" money={false} value={result.american_odds} />
            <ResultValue label="Implied probability" money={false} value={`${result.implied_probability}%`} />
          </dl>
        </article></div>
      </div> : null}
    </div>
  </div>;
}

type AccumulatorInputs = { stake: string; selections: Array<{ label: string; odds: string; state: "winner" | "loser" | "void" }> };
type AccumulatorResult = { combined_odds: string; total_stake: string; total_return: string; total_profit: string; all_win_return: string; all_win_profit: string; any_loss_profit: string };
const accumulatorDefaults: AccumulatorInputs = { stake: "", selections: [{ label: "Selection 1", odds: "", state: "winner" }, { label: "Selection 2", odds: "", state: "winner" }] };

function readAccumulator(search: URLSearchParams): AccumulatorInputs {
  try {
    const parsed = JSON.parse(search.get("accumulator") ?? "null") as AccumulatorInputs | null;
    return parsed && Array.isArray(parsed.selections) && parsed.selections.length >= 2 && parsed.selections.length <= 20 ? parsed : accumulatorDefaults;
  } catch { return accumulatorDefaults; }
}

function AccumulatorCalculator({ onState, search }: { onState: (params: URLSearchParams) => void; search: URLSearchParams }) {
  const [inputs, setInputs] = useState<AccumulatorInputs>(() => readAccumulator(search));
  const [result, setResult] = useState<AccumulatorResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const requestVersion = useRef(0); const requestAbort = useRef<AbortController | null>(null);
  const invalid = !isPositiveAmount(inputs.stake) || inputs.selections.some((item) => !item.label.trim() || Boolean(getSportsbookOddsInputError(item.odds, { required: true })));
  const serialized = JSON.stringify(inputs);
  useEffect(() => { onState(new URLSearchParams({ family: "multiples", accumulator: serialized })); }, [onState, serialized]);
  function update(next: AccumulatorInputs) { requestAbort.current?.abort(); requestVersion.current += 1; setInputs(next); setResult(null); setError(""); setBusy(false); }
  function updateSelection(index: number, patch: Partial<AccumulatorInputs["selections"][number]>) { update({ ...inputs, selections: inputs.selections.map((item, at) => at === index ? { ...item, ...patch } : item) }); }
  useEffect(() => {
    requestAbort.current?.abort(); const version = ++requestVersion.current; if (invalid) return;
    const controller = new AbortController(); requestAbort.current = controller;
    const timer = window.setTimeout(() => { setBusy(true); void fetch(`${apiBaseUrl}/fund-manager/calculators/accumulator/preview`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ stake: inputs.stake, selections: inputs.selections }) }).then(async (response) => {
      if (!response.ok) throw new Error(formatApiErrorBody(await response.text(), "Unable to calculate accumulator."));
      const next = await response.json() as AccumulatorResult; if (version === requestVersion.current) { setResult(next); setError(""); }
    }).catch((caught) => { if (version === requestVersion.current && !(caught instanceof DOMException && caught.name === "AbortError")) { setResult(null); setError(caught instanceof Error ? caught.message : "Unable to calculate accumulator."); } }).finally(() => { if (version === requestVersion.current) setBusy(false); }); }, 120);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [inputs, invalid]);
  useEffect(() => () => requestAbort.current?.abort(), []);
  function reset() { requestAbort.current?.abort(); requestVersion.current += 1; setInputs(accumulatorDefaults); setResult(null); setError(""); setBusy(false); }
  return <div className="calculator-panel-shell" data-pd-id="calculators.accumulator"><div className="calculator-shell">
    <div className="calculator-band calculator-band-primary stack">
      <div className="calculator-segment calculator-segment-back"><div className="calculator-segment-heading"><span className="eyebrow">Multiple bet</span></div><div className="calculator-segment-grid calculator-segment-grid-back"><Field error={null} id="accumulator-stake" label="Stake" onChange={(stake) => update({ ...inputs, stake })} value={inputs.stake} /></div></div>
      <div className="multi-lay-grid-wrap"><table className="data-table dense-calculator-grid" data-pd-id="calculators.accumulator.selections"><thead><tr><th>Selection</th><th>Odds</th><th>Result</th><th>Remove</th></tr></thead><tbody>{inputs.selections.map((item, index) => <tr key={index}><td data-label="Selection"><label className="field-control"><span className="sr-only">Selection {index + 1} label</span><input aria-label={`Selection ${index + 1} label`} onChange={(event) => updateSelection(index, { label: event.target.value })} value={item.label} /></label></td><td data-label="Odds"><label className="field-control"><span className="sr-only">Selection {index + 1} odds</span><input aria-label={`Selection ${index + 1} odds`} inputMode="decimal" onBlur={() => { const normalized = normalizeCalculatorOddsInput(item.odds); if (normalized.converted) updateSelection(index, { odds: normalized.canonicalValue }); }} onChange={(event) => updateSelection(index, { odds: event.target.value })} value={item.odds} /></label></td><td data-label="Result"><label className="field-control"><span className="sr-only">Selection {index + 1} result</span><select aria-label={`Selection ${index + 1} result`} onChange={(event) => updateSelection(index, { state: event.target.value as AccumulatorInputs["selections"][number]["state"] })} value={item.state}><option value="winner">Winner</option><option value="loser">Loser</option><option value="void">Void</option></select></label></td><td data-label="Remove">{inputs.selections.length > 2 ? <button aria-label={`Remove selection ${index + 1}`} className="icon-button icon-button-destructive multi-lay-action-button" onClick={() => update({ ...inputs, selections: inputs.selections.filter((_, at) => at !== index) })} type="button"><span aria-hidden="true" className="material-symbols-outlined">delete</span></button> : null}</td></tr>)}</tbody></table></div>
      <div className="tracker-nav"><button className="button-link" disabled={inputs.selections.length >= 20} onClick={() => update({ ...inputs, selections: [...inputs.selections, { label: `Selection ${inputs.selections.length + 1}`, odds: "", state: "winner" }] })} type="button">Add selection</button><button className="button-link icon-text-action" data-pd-id="calculators.accumulator.reset" onClick={reset} type="button"><span aria-hidden="true" className="material-symbols-outlined">restart_alt</span><span>Reset</span></button></div>
      <p className="field-hint">Core all-to-win multiple. Each Way, Rule 4 and bookmaker bonuses remain outside this verified scope.</p>{busy ? <p className="field-hint" role="status">Updating reference…</p> : null}{error ? <p className="error-text" role="alert">{error}</p> : null}
    </div>
    {result ? <div className="calculator-band calculator-band-secondary"><CalculatorOutcomes columns={["Return"]} inspectionId="calculators.accumulator.outcomes" rows={[{ key: "all-win", label: "All non-void selections win", tone: "positive", components: [[result.all_win_return]], total: result.all_win_profit }, { key: "any-loss", label: "Any selection loses", tone: "danger", components: [["0.00"]], total: result.any_loss_profit }]} summary={<><span>Total stake <CalculatorOutcomeValueDisplay label="Total stake" value={result.total_stake} /></span><span>Current result <CalculatorOutcomeValueDisplay label="Current result" value={result.total_profit} /></span></>} /></div> : null}
  </div></div>;
}

type DutchingInputs = { betType: "normal" | "free_bet"; firstStake: string; rounding: "0" | "1" | "5" | "10"; selections: Array<{ label: string; odds: string; commission: string }> };
type DutchingResult = { total_stake: string; reference_result: string; selections: Array<{ label: string; stake: string; return_value: string; profit: string }> };
const dutchingDefaults: DutchingInputs = { betType: "normal", firstStake: "", rounding: "0", selections: [{ label: "Selection 1", odds: "", commission: "0" }, { label: "Selection 2", odds: "", commission: "0" }] };

function readDutching(search: URLSearchParams): DutchingInputs {
  try { const parsed = JSON.parse(search.get("dutching") ?? "null") as DutchingInputs | null; return parsed && [2, 3].includes(parsed.selections?.length) ? parsed : dutchingDefaults; } catch { return dutchingDefaults; }
}

function DutchingCalculator({ onState, search }: { onState: (params: URLSearchParams) => void; search: URLSearchParams }) {
  const [inputs, setInputs] = useState<DutchingInputs>(() => readDutching(search)); const [result, setResult] = useState<DutchingResult | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const version = useRef(0); const abort = useRef<AbortController | null>(null);
  const invalid = !isPositiveAmount(inputs.firstStake) || inputs.selections.some((item) => !item.label.trim() || Boolean(getSportsbookOddsInputError(item.odds, { required: true })) || commissionError(item.commission) !== null || Number(item.commission) >= 1);
  const serialized = JSON.stringify(inputs);
  useEffect(() => { onState(new URLSearchParams({ family: "dutching", dutching: serialized })); }, [onState, serialized]);
  function update(next: DutchingInputs) { abort.current?.abort(); version.current += 1; setInputs(next); setResult(null); setError(""); setBusy(false); }
  function updateSelection(index: number, patch: Partial<DutchingInputs["selections"][number]>) { update({ ...inputs, selections: inputs.selections.map((item, at) => at === index ? { ...item, ...patch } : item) }); }
  useEffect(() => { abort.current?.abort(); const current = ++version.current; if (invalid) return; const controller = new AbortController(); abort.current = controller; const timer = window.setTimeout(() => { setBusy(true); void fetch(`${apiBaseUrl}/fund-manager/calculators/dutching/preview`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ bet_type: inputs.betType, first_stake: inputs.firstStake, rounding_increment: inputs.rounding, selections: inputs.selections }) }).then(async (response) => { if (!response.ok) throw new Error(formatApiErrorBody(await response.text(), "Unable to calculate Dutching.")); const next = await response.json() as DutchingResult; if (current === version.current) { setResult(next); setError(""); } }).catch((caught) => { if (current === version.current && !(caught instanceof DOMException && caught.name === "AbortError")) { setResult(null); setError(caught instanceof Error ? caught.message : "Unable to calculate Dutching."); } }).finally(() => { if (current === version.current) setBusy(false); }); }, 120); return () => { window.clearTimeout(timer); controller.abort(); }; }, [inputs, invalid]);
  useEffect(() => () => abort.current?.abort(), []);
  function reset() { abort.current?.abort(); version.current += 1; setInputs(dutchingDefaults); setResult(null); setError(""); setBusy(false); }
  return <div className="calculator-panel-shell" data-pd-id="calculators.dutching"><div className="calculator-shell"><div className="calculator-band calculator-band-primary stack">
    <div className="ledger-calculator-mode-bar"><SelectField id="dutching-bet-type" label="Bet type" onChange={(betType) => update({ ...inputs, betType: betType as DutchingInputs["betType"] })} options={[["normal", "Normal"], ["free_bet", "Free Bet SNR"]]} value={inputs.betType} /><SelectField id="dutching-rounding" label="Stake rounding" onChange={(rounding) => update({ ...inputs, rounding: rounding as DutchingInputs["rounding"] })} options={[["0", "Nearest penny"], ["1", "Nearest £1"], ["5", "Nearest £5"], ["10", "Nearest £10"]]} value={inputs.rounding} /><Field error={null} id="dutching-first-stake" label={inputs.betType === "free_bet" ? "Free bet value" : "First stake"} onChange={(firstStake) => update({ ...inputs, firstStake })} value={inputs.firstStake} /></div>
    <div className="multi-lay-grid-wrap"><table className="data-table dense-calculator-grid" data-pd-id="calculators.dutching.selections"><thead><tr><th>Selection</th><th>Odds</th><th>Commission</th><th>Stake</th><th>Remove</th></tr></thead><tbody>{inputs.selections.map((item, index) => { const calculated = result?.selections[index]; return <tr key={index}><td data-label="Selection"><label className="field-control"><span className="sr-only">Dutch selection {index + 1} label</span><input aria-label={`Dutch selection ${index + 1} label`} onChange={(event) => updateSelection(index, { label: event.target.value })} value={item.label} /></label></td><td data-label="Odds"><label className="field-control"><span className="sr-only">Dutch selection {index + 1} odds</span><input aria-label={`Dutch selection ${index + 1} odds`} inputMode="decimal" onBlur={() => { const normalized = normalizeCalculatorOddsInput(item.odds); if (normalized.converted) updateSelection(index, { odds: normalized.canonicalValue }); }} onChange={(event) => updateSelection(index, { odds: event.target.value })} value={item.odds} /></label></td><td data-label="Commission"><label className="field-control"><span className="sr-only">Dutch selection {index + 1} commission</span><input aria-label={`Dutch selection ${index + 1} commission`} inputMode="decimal" onChange={(event) => updateSelection(index, { commission: event.target.value })} value={item.commission} /></label></td><td data-label="Stake">{index === 0 ? inputs.firstStake ? <FinancialValue label="First selection stake" tone="inherit" value={inputs.firstStake} /> : <span>£ -</span> : <CopyableFinancialValue dataPdId={`calculators.dutching.selection-${index + 1}.copyable`} label={`Selection ${index + 1} stake`} value={calculated?.stake} />}</td><td data-label="Remove">{inputs.selections.length > 2 && index > 1 ? <button aria-label={`Remove Dutch selection ${index + 1}`} className="icon-button icon-button-destructive multi-lay-action-button" onClick={() => update({ ...inputs, selections: inputs.selections.filter((_, at) => at !== index) })} type="button"><span aria-hidden="true" className="material-symbols-outlined">delete</span></button> : null}</td></tr>; })}</tbody></table></div>
    <div className="tracker-nav"><button className="button-link" disabled={inputs.selections.length >= 3} onClick={() => update({ ...inputs, selections: [...inputs.selections, { label: "Selection 3", odds: "", commission: "0" }] })} type="button">Add third selection</button><button className="button-link icon-text-action" data-pd-id="calculators.dutching.reset" onClick={reset} type="button"><span aria-hidden="true" className="material-symbols-outlined">restart_alt</span><span>Reset</span></button></div>
    <p className="field-hint">Simple mode equalises covered outcomes. Advanced breakeven weighting remains pending an authoritative allocation rule.</p>{busy ? <p className="field-hint" role="status">Updating stakes…</p> : null}{error ? <p className="error-text" role="alert">{error}</p> : null}
    {result ? <CalculatorOutcomes columns={["Return"]} inspectionId="calculators.dutching.outcomes" rows={result.selections.map((item, index) => ({ key: `selection-${index + 1}`, label: `${item.label} wins`, tone: index === 0 ? "primary" : "positive", components: [[item.return_value]], total: item.profit }))} summary={<><span>Total stake <CalculatorOutcomeValueDisplay label="Total stake" value={result.total_stake} /></span><span>Conservative result <CalculatorOutcomeValueDisplay label="Conservative result" value={result.reference_result} /></span></>} /> : null}
  </div></div></div>;
}

function isPositiveAmount(value: string) { return hasCompleteDecimalInputSyntax(value) && Number.isFinite(Number(value)) && Number(value) > 0; }
function commissionError(value: string) { return hasCompleteDecimalInputSyntax(value) && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 1 ? null : "Enter commission as a decimal from 0 to 1, for example 0.02."; }

function Field({ error, id, inputMode = "decimal", label, onBlur, onChange, supportingText, value }: { error: string | null; id: string; inputMode?: "decimal" | "numeric" | "text"; label: string; onBlur?: () => void; onChange: (value: string) => void; supportingText?: string; value: string }) {
  const errorId = `calculator-${id}-error`;
  const dataPdId = id.startsWith("multi-") || id.startsWith("each-way-") || id.startsWith("sequential-") || id.startsWith("early-") || id.startsWith("accumulator-") || id.startsWith("dutching-") || id.startsWith("blackjack-") || id.startsWith("odds-probability-") ? `calculators.${id}` : `calculators.matched-betting.${id}`;
  return <label className={`field-control${error ? " is-invalid" : ""}`} htmlFor={`calculator-${id}`}><span>{label}</span><input aria-describedby={error ? errorId : undefined} aria-invalid={Boolean(error)} data-pd-id={dataPdId} id={`calculator-${id}`} inputMode={inputMode} onBlur={onBlur} onChange={(event) => onChange(event.target.value)} type="text" value={value} />{error ? <span className="field-validation-text" id={errorId} role="alert">{error}</span> : supportingText ? <span className="field-support-text">{supportingText}</span> : null}</label>;
}
function SelectField({ disabled = false, id, label, onChange, options, value }: { disabled?: boolean; id: string; label: string; onChange: (value: string) => void; options: readonly (readonly [string, string])[]; value: string }) {
  const dataPdId = id.startsWith("multi-") || id.startsWith("each-way-") || id.startsWith("sequential-") || id.startsWith("early-") || id.startsWith("accumulator-") || id.startsWith("dutching-") || id.startsWith("blackjack-") || id.startsWith("odds-probability-") ? `calculators.${id}` : `calculators.matched-betting.${id}`;
  return <label className="field-control ledger-calculator-mode-field" htmlFor={`calculator-${id}`}><span>{label}</span><select data-pd-id={dataPdId} disabled={disabled} id={`calculator-${id}`} onChange={(event) => onChange(event.target.value)} value={value}>{options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}</select></label>;
}
function ResultValue({ copyable = false, dataPdId, label, money = true, value }: { copyable?: boolean; dataPdId?: string; label: string; money?: boolean; value: string }) { return <div><dt>{label}</dt><dd>{money ? copyable ? <CopyableFinancialValue dataPdId={dataPdId} label={label} value={value} /> : <FinancialValue label={label} value={value} /> : value}</dd></div>; }
