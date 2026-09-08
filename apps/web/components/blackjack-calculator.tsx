"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { CalculatorSegmentedControl } from "@/components/calculator-segmented-control";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { FinancialValue } from "@/components/financial-value";
import { apiBaseUrl } from "@/lib/api";
import { formatApiErrorBody } from "@/lib/api-error";
import {
  multiplyBlackjackStake,
  parseBlackjackStakePence,
  splitBlackjackStakeExactly,
} from "@/lib/blackjack-session";

type BlackjackCard = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";
type CardValue = BlackjackCard | "";
type BlackjackAction = "Hit" | "Stand" | "Double" | "Split" | "Surrender";
type HandStatus = "playing" | "awaiting-double-card" | "stood" | "doubled" | "surrendered" | "bust";
type BlackjackResult = {
  action: BlackjackAction | "Bust";
  fallback_action: BlackjackAction | null;
  hand_kind: "hard" | "soft" | "pair" | "bust";
  total: number;
};
type Recommendation = Pick<BlackjackResult, "action" | "fallback_action" | "hand_kind" | "total"> & { cards: BlackjackCard[] };
type BlackjackHand = {
  actions: BlackjackAction[];
  cards: CardValue[];
  committedUnits: number;
  id: string;
  label: string;
  lastResult: BlackjackResult | null;
  recommendations: Recommendation[];
  status: HandStatus;
};
type BlackjackRound = {
  archived: boolean;
  baseStake: string;
  dealer: CardValue;
  handNumber: number;
  hands: BlackjackHand[];
  hitSoft17: boolean;
  activeHandId: string;
  splitOccurred: boolean;
  surrender: boolean;
};
type BlackjackHistoryEntry = {
  baseStake: string;
  committedStake: string;
  dealer: BlackjackCard;
  forfeitedStake: string | null;
  handNumber: number;
  hands: BlackjackHand[];
  hitSoft17: boolean;
  returnedStake: string | null;
  surrender: boolean;
};
type StoredBlackjackSession = { history: BlackjackHistoryEntry[]; round: BlackjackRound };

const cards: BlackjackCard[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const storageKey = "calculator.blackjack.session.v1";
const terminalStatuses: HandStatus[] = ["stood", "doubled", "surrendered", "bust"];

function emptyHand(handNumber: number, suffix = "main"): BlackjackHand {
  return {
    actions: [], cards: ["", ""], committedUnits: 1, id: `hand-${handNumber}-${suffix}`,
    label: "Player", lastResult: null, recommendations: [], status: "playing",
  };
}

function emptyRound(handNumber: number, baseStake = "5.00", surrender = false, hitSoft17 = false): BlackjackRound {
  const hand = emptyHand(handNumber);
  return {
    activeHandId: hand.id, archived: false, baseStake, dealer: "", handNumber,
    hands: [hand], hitSoft17, splitOccurred: false, surrender,
  };
}

function isCard(value: unknown): value is BlackjackCard {
  return typeof value === "string" && cards.includes(value as BlackjackCard);
}

function readRound(search: URLSearchParams): BlackjackRound {
  try {
    const parsed = JSON.parse(search.get("blackjack") ?? "null") as Partial<BlackjackRound> & { cards?: unknown[] } | null;
    if (!parsed) return emptyRound(1);
    if (Array.isArray(parsed.hands) && parsed.hands.length > 0) return parsed as BlackjackRound;
    const legacyCards = Array.isArray(parsed.cards) ? parsed.cards.filter(isCard) : [];
    if (isCard(parsed.dealer) && legacyCards.length >= 2) {
      const round = emptyRound(1);
      return {
        ...round,
        dealer: parsed.dealer,
        hands: [{ ...round.hands[0], cards: legacyCards }],
        hitSoft17: Boolean(parsed.hitSoft17),
        surrender: Boolean(parsed.surrender),
      };
    }
  } catch {
    // Invalid URL state falls back to a clean calculator hand.
  }
  return emptyRound(1);
}

function historyEntry(round: BlackjackRound): BlackjackHistoryEntry {
  const units = round.hands.reduce((total, hand) => total + hand.committedUnits, 0);
  const surrendered = round.hands.some((hand) => hand.status === "surrendered");
  return {
    baseStake: round.baseStake,
    committedStake: multiplyBlackjackStake(round.baseStake, units) ?? round.baseStake,
    dealer: round.dealer as BlackjackCard,
    forfeitedStake: surrendered ? splitBlackjackStakeExactly(round.baseStake) : null,
    handNumber: round.handNumber,
    hands: round.hands,
    hitSoft17: round.hitSoft17,
    returnedStake: surrendered ? splitBlackjackStakeExactly(round.baseStake) : null,
    surrender: round.surrender,
  };
}

function handSummary(hand: BlackjackHand) {
  const final = hand.lastResult;
  if (!final) return "Incomplete";
  const kind = final.hand_kind === "bust" ? "Bust" : `${final.hand_kind[0].toUpperCase()}${final.hand_kind.slice(1)} ${final.total}`;
  const action = hand.actions.at(-1) ?? final.action;
  return `${kind} · ${action}`;
}

function BlackjackCardPicker({ disabled = false, label, onChange, value }: {
  disabled?: boolean;
  label: string;
  onChange: (card: CardValue) => void;
  value: CardValue;
}) {
  return (
    <label className="blackjack-card-picker">
      <span>{label}</span>
      <select aria-label={label} disabled={disabled} onChange={(event) => onChange(event.target.value as CardValue)} value={value}>
        <option value="">Choose</option>
        {cards.map((card) => <option key={card} value={card}>{card}</option>)}
      </select>
    </label>
  );
}

export function BlackjackCalculator({ onState, search }: {
  onState: (params: URLSearchParams) => void;
  search: URLSearchParams;
}) {
  const [round, setRound] = useState<BlackjackRound>(() => readRound(search));
  const [history, setHistory] = useState<BlackjackHistoryEntry[]>([]);
  const [preview, setPreview] = useState<BlackjackResult | null>(null);
  const [error, setError] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const requestVersion = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const activeHand = round.hands.find((hand) => hand.id === round.activeHandId) ?? round.hands[0];
  const stakeValid = parseBlackjackStakePence(round.baseStake) !== null;
  const selectedCards = useMemo(() => activeHand.cards.filter(isCard), [activeHand.cards]);
  const hasPendingCard = activeHand.cards.some((card) => card === "");
  const previewKey = JSON.stringify([round.dealer, selectedCards, hasPendingCard, round.surrender, round.hitSoft17, activeHand.id, activeHand.status]);
  const hasUrlState = search.has("blackjack");
  const visiblePreview = terminalStatuses.includes(activeHand.status) ? activeHand.lastResult : preview;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!hasUrlState) {
        try {
          const stored = JSON.parse(sessionStorage.getItem(storageKey) ?? "null") as StoredBlackjackSession | null;
          if (stored?.round && Array.isArray(stored.history)) {
            setRound(stored.round);
            setHistory(stored.history);
          }
        } catch {
          // Session storage is optional; calculator state remains usable in memory.
        }
      }
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hasUrlState]);

  useEffect(() => {
    if (!storageReady) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ history, round } satisfies StoredBlackjackSession));
    } catch {
      // Session storage is optional; calculator state remains usable in memory.
    }
  }, [history, round, storageReady]);

  useEffect(() => {
    const shareable = { ...round, archived: false };
    onState(new URLSearchParams({ family: "blackjack", blackjack: JSON.stringify(shareable) }));
  }, [onState, round]);

  useEffect(() => {
    abort.current?.abort();
    const current = ++requestVersion.current;
    if (!isCard(round.dealer) || selectedCards.length < 2 || hasPendingCard || terminalStatuses.includes(activeHand.status)) {
      return;
    }
    const controller = new AbortController();
    abort.current = controller;
    const timer = window.setTimeout(() => {
      void fetch(`${apiBaseUrl}/fund-manager/calculators/blackjack/preview`, {
        body: JSON.stringify({
          dealer_card: round.dealer,
          player_cards: selectedCards,
          surrender_allowed: round.surrender && !round.splitOccurred,
          dealer_hits_soft_17: round.hitSoft17,
        }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal: controller.signal,
      }).then(async (response) => {
        if (!response.ok) throw new Error(formatApiErrorBody(await response.text(), "Unable to calculate blackjack strategy."));
        const next = await response.json() as BlackjackResult;
        if (current !== requestVersion.current) return;
        setPreview(next);
        setError("");
        setRound((existing) => ({
          ...existing,
          hands: existing.hands.map((hand) => {
            if (hand.id !== activeHand.id) return hand;
            const snapshot: Recommendation = { ...next, cards: selectedCards };
            const previous = hand.recommendations.at(-1);
            const recommendations = previous && JSON.stringify(previous) === JSON.stringify(snapshot)
              ? hand.recommendations
              : [...hand.recommendations, snapshot];
            const status = next.hand_kind === "bust"
              ? "bust"
              : hand.status === "awaiting-double-card" ? "doubled" : hand.status;
            return { ...hand, lastResult: next, recommendations, status };
          }),
        }));
      }).catch((caught) => {
        if (current === requestVersion.current && !(caught instanceof DOMException && caught.name === "AbortError")) {
          setPreview(null);
          setError(caught instanceof Error ? caught.message : "Unable to calculate blackjack strategy.");
        }
      });
    }, 120);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [activeHand.id, activeHand.status, hasPendingCard, previewKey, round.dealer, round.hitSoft17, round.splitOccurred, round.surrender, selectedCards]);

  useEffect(() => {
    if (round.archived || !isCard(round.dealer) || !stakeValid || !round.hands.every((hand) => terminalStatuses.includes(hand.status))) return;
    const timer = window.setTimeout(() => {
      setHistory((entries) => entries.some((entry) => entry.handNumber === round.handNumber)
        ? entries
        : [...entries, historyEntry(round)]);
      setRound((current) => ({ ...current, archived: true }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [round, stakeValid]);

  useEffect(() => () => abort.current?.abort(), []);

  function updateRound(change: Partial<BlackjackRound>) {
    abort.current?.abort();
    requestVersion.current += 1;
    setPreview(null);
    setError("");
    setRound((current) => ({ ...current, ...change, archived: false }));
  }

  function updateActiveHand(change: (hand: BlackjackHand) => BlackjackHand) {
    abort.current?.abort();
    requestVersion.current += 1;
    setPreview(null);
    setError("");
    setRound((current) => ({
      ...current,
      archived: false,
      hands: current.hands.map((hand) => hand.id === current.activeHandId ? change(hand) : hand),
    }));
  }

  function chooseCard(index: number, card: CardValue) {
    updateActiveHand((hand) => ({
      ...hand,
      cards: hand.cards.map((current, at) => at === index ? card : current),
      lastResult: null,
      status: hand.status === "awaiting-double-card" ? "awaiting-double-card" : "playing",
    }));
  }

  function takeAction(action: BlackjackAction) {
    if (!visiblePreview) return;
    if (action === "Hit") {
      updateActiveHand((hand) => ({ ...hand, actions: [...hand.actions, action], cards: [...hand.cards, ""], lastResult: null }));
      return;
    }
    if (action === "Double") {
      updateActiveHand((hand) => ({ ...hand, actions: [...hand.actions, action], cards: [...hand.cards, ""], committedUnits: 2, lastResult: null, status: "awaiting-double-card" }));
      return;
    }
    if (action === "Split") {
      const [first, second] = activeHand.cards;
      const splitRecommendation: Recommendation = { ...visiblePreview, cards: selectedCards };
      const firstHand: BlackjackHand = { ...emptyHand(round.handNumber, "split-1"), actions: ["Split"], cards: [first, ""], label: "Split hand 1", recommendations: [splitRecommendation] };
      const secondHand: BlackjackHand = { ...emptyHand(round.handNumber, "split-2"), actions: ["Split"], cards: [second, ""], label: "Split hand 2", recommendations: [splitRecommendation] };
      updateRound({ activeHandId: firstHand.id, hands: [firstHand, secondHand], splitOccurred: true });
      return;
    }
    updateActiveHand((hand) => ({ ...hand, actions: [...hand.actions, action], status: action === "Stand" ? "stood" : "surrendered" }));
  }

  function startFreshHand() {
    abort.current?.abort();
    requestVersion.current += 1;
    setPreview(null);
    setError("");
    setRound(emptyRound(history.length + 1, round.baseStake, round.surrender, round.hitSoft17));
  }

  const legalActions = useMemo(() => {
    if (!visiblePreview || visiblePreview.hand_kind === "bust" || terminalStatuses.includes(activeHand.status)) return [];
    const actions: BlackjackAction[] = ["Hit", "Stand"];
    if (activeHand.cards.length === 2) actions.push("Double");
    if (!round.splitOccurred && activeHand.cards.length === 2 && activeHand.cards[0] === activeHand.cards[1]) actions.push("Split");
    if (!round.splitOccurred && round.surrender && activeHand.cards.length === 2) actions.push("Surrender");
    return actions;
  }, [activeHand, round.splitOccurred, round.surrender, visiblePreview]);

  const committedUnits = round.hands.reduce((total, hand) => total + hand.committedUnits, 0);
  const committedStake = multiplyBlackjackStake(round.baseStake, committedUnits);
  const baseStakeError = round.baseStake === "" || stakeValid ? null : "Enter a positive stake using pounds and up to two decimal places.";

  return (
    <div className="calculator-panel-shell" data-pd-id="calculators.blackjack">
      <div className="calculator-shell blackjack-calculator-shell">
        <section className="calculator-band calculator-band-primary stack blackjack-control-panel" data-pd-id="calculators.blackjack.controls">
          <div className="blackjack-control-heading">
            <div className="tracker-nav">
              <button className="button-link icon-text-action" data-pd-id="calculators.blackjack.reset-hand" onClick={startFreshHand} type="button"><span aria-hidden="true" className="material-symbols-outlined">restart_alt</span><span>Reset Hand</span></button>
              <button className="button-link" data-pd-id="calculators.blackjack.deal-again" disabled={!round.archived} onClick={startFreshHand} type="button">Deal Again</button>
            </div>
            <label className={`field-control blackjack-stake-field${baseStakeError ? " is-invalid" : ""}`} htmlFor="blackjack-base-stake">
              <span>Base Stake</span>
              <input aria-describedby={baseStakeError ? "blackjack-base-stake-error" : undefined} aria-invalid={Boolean(baseStakeError)} disabled={round.hands.some((hand) => hand.actions.length > 0)} id="blackjack-base-stake" inputMode="decimal" onChange={(event) => updateRound({ baseStake: event.target.value })} value={round.baseStake} />
              {baseStakeError ? <span className="field-validation-text" id="blackjack-base-stake-error" role="alert">{baseStakeError}</span> : null}
            </label>
          </div>
          <div className="blackjack-rule-grid">
            <div className="blackjack-rule-control">
              <span>Surrender Allowed</span>
              <CalculatorSegmentedControl ariaLabel="Surrender Allowed" dataPdId="calculators.blackjack.surrender" onChange={(value) => updateRound({ surrender: value === "yes" })} options={[{ label: "No", value: "no" }, { label: "Yes", value: "yes" }]} value={round.surrender ? "yes" : "no"} />
            </div>
            <div className="blackjack-rule-control">
              <span>Dealer on Soft 17</span>
              <CalculatorSegmentedControl ariaLabel="Dealer on Soft 17" dataPdId="calculators.blackjack.soft-17" onChange={(value) => updateRound({ hitSoft17: value === "hits" })} options={[{ label: "Stands", value: "stands" }, { label: "Hits", value: "hits" }]} value={round.hitSoft17 ? "hits" : "stands"} />
            </div>
          </div>
        </section>

        <section className="calculator-band calculator-band-secondary blackjack-table" data-pd-id="calculators.blackjack.table">
          <div className="blackjack-table-side blackjack-dealer-side">
            <h3>Dealer</h3>
            <BlackjackCardPicker label="Dealer up-card" onChange={(dealer) => updateRound({ dealer })} value={round.dealer} />
          </div>
          <div className="blackjack-table-side blackjack-player-side">
            <div className="blackjack-player-heading"><h3>Player</h3>{committedStake ? <span>Committed <FinancialValue label="Committed stake" tone="inherit" value={committedStake} /></span> : null}</div>
            {round.hands.length > 1 ? <CalculatorSegmentedControl ariaLabel="Active split hand" dataPdId="calculators.blackjack.split-hands" onChange={(activeHandId) => updateRound({ activeHandId })} options={round.hands.map((hand) => ({ label: hand.label, value: hand.id }))} value={round.activeHandId} /> : null}
            <div className="blackjack-card-row">
              {activeHand.cards.map((card, index) => <BlackjackCardPicker disabled={terminalStatuses.includes(activeHand.status)} key={`${activeHand.id}-${index}`} label={`${activeHand.label} card ${index + 1}`} onChange={(next) => chooseCard(index, next)} value={card} />)}
            </div>
          </div>
        </section>

        {error ? <p className="error-text" role="alert">{error}</p> : null}
        {visiblePreview ? <section className="calculator-band calculator-band-secondary blackjack-result" data-pd-id="calculators.blackjack.result">
          <div className="blackjack-result-copy">
            <span>Hand: <strong>{visiblePreview.total} ({visiblePreview.hand_kind.toUpperCase()})</strong></span>
            <span>Recommended Move: <strong>{visiblePreview.action.toUpperCase()}</strong>{visiblePreview.fallback_action ? ` — otherwise ${visiblePreview.fallback_action}` : ""}</span>
          </div>
          {legalActions.length > 0 ? <div aria-label="Action taken" className="blackjack-action-group" role="group">
            {legalActions.map((action) => <button aria-describedby="blackjack-strategy-guidance" className={visiblePreview.action === action ? "modal-primary-button" : "button-link"} data-recommended={visiblePreview.action === action ? "true" : undefined} key={action} onClick={() => takeAction(action)} type="button">{action}{visiblePreview.action === action ? <span className="sr-only"> (recommended)</span> : null}</button>)}
          </div> : <p className="field-hint">This player hand is complete.</p>}
          <p className="calculator-section-guidance" id="blackjack-strategy-guidance">Basic strategy minimises the house edge over time; it does not guarantee this hand will win.</p>
        </section> : <section aria-live="polite" className="calculator-band calculator-band-secondary blackjack-result blackjack-result-pending" data-pd-id="calculators.blackjack.result-pending"><p>Choose the dealer card and all visible player cards to see the recommended move.</p></section>}

        <section className="calculator-band calculator-band-secondary stack blackjack-history" data-pd-id="calculators.blackjack.history">
          <div className="blackjack-section-heading"><div><span className="eyebrow">Session history</span><h3>You have played {history.length} {history.length === 1 ? "hand" : "hands"}</h3></div><button className="button-link destructive-action" disabled={history.length === 0} onClick={() => setConfirmClear(true)} type="button"><span aria-hidden="true" className="material-symbols-outlined">delete</span><span>Reset Session</span></button></div>
          {history.length === 0 ? <p className="field-hint">Completed hands appear here for this browser tab only.</p> : <div className="table-scroll"><table className="data-table blackjack-history-table"><thead><tr><th>Hand</th><th>Stake</th><th>Dealer</th><th>Result</th></tr></thead><tbody>{history.map((entry) => <tr key={entry.handNumber}><td data-label="Hand"><details><summary>#{entry.handNumber}</summary><div className="blackjack-history-detail"><span>Surrender {entry.surrender ? "allowed" : "not allowed"}; dealer {entry.hitSoft17 ? "hits" : "stands"} on Soft 17.</span>{entry.hands.map((hand) => <span key={hand.id}>{hand.label}: {hand.cards.join(", ")} · Recommended {hand.recommendations.map((item) => item.action).join(" → ") || "—"} · Chosen {hand.actions.join(" → ") || "—"}</span>)}{entry.forfeitedStake ? <span>Surrender reference: £ {entry.returnedStake} returned / £ {entry.forfeitedStake} forfeited.</span> : null}</div></details></td><td data-label="Stake"><FinancialValue label={`Hand ${entry.handNumber} base stake`} tone="inherit" value={entry.baseStake} /> → <FinancialValue label={`Hand ${entry.handNumber} committed stake`} tone="inherit" value={entry.committedStake} /></td><td data-label="Dealer">{entry.dealer}</td><td data-label="Result">{entry.hands.map(handSummary).join("; ")}</td></tr>)}</tbody></table></div>}
        </section>

        <section className="calculator-band calculator-band-secondary stack blackjack-how-to" data-pd-id="calculators.blackjack.how-to"><span className="eyebrow">How to use</span><ol><li>Set whether Surrender is allowed.</li><li>Set whether the dealer Hits or Stands on Soft 17.</li><li>Enter the dealer&apos;s visible card.</li><li>Enter Card 1 and Card 2.</li><li>Follow the recommended basic-strategy move.</li><li>If you Hit, enter the next card and recalculate.</li><li>Record the action actually taken to build session history.</li></ol><p className="field-hint">Recommendations minimise the house edge over the long run; they do not guarantee an individual hand. Never take Insurance under this strategy.</p></section>
      </div>
      <ConfirmationDialog cancelLabel="Keep history" confirmLabel="Clear History" description="Clear this tab's Blackjack hand history and restart the session counter?" onCancel={() => setConfirmClear(false)} onConfirm={() => { try { sessionStorage.removeItem(storageKey); } catch { /* Session storage is optional. */ } setHistory([]); setRound(emptyRound(1)); setPreview(null); setConfirmClear(false); }} open={confirmClear} title="Clear Blackjack history?" />
    </div>
  );
}
