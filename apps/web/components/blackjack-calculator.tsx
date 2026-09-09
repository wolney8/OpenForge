"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { CalculatorSegmentedControl } from "@/components/calculator-segmented-control";
import { BlackjackCardSlot, BlackjackRankPicker } from "@/components/blackjack-rank-picker";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { ContextHelp } from "@/components/context-help";
import { FinancialInputField } from "@/components/financial-input-field";
import { FinancialValue, FinancialValueReplayGroup } from "@/components/financial-value";
import { apiBaseUrl } from "@/lib/api";
import { formatApiErrorBody } from "@/lib/api-error";
import { AUTHENTICATED_SESSION_ENDED_EVENT, BLACKJACK_SESSION_STORAGE_KEY } from "@/lib/authenticated-session-state";
import { isBlackjackCard, type BlackjackCard, type BlackjackCardValue as CardValue } from "@/lib/blackjack-ranks";
import {
  blackjackCommittedStake,
  centsToMoney,
  moneyInputError,
  moneyToCents,
  subtractMoney,
  subtractSignedMoney,
  type BlackjackSessionMode,
  type BlackjackTableType,
} from "@/lib/blackjack-session";

type BlackjackAction = "Hit" | "Stand" | "Double" | "Split" | "Surrender";
type BlackjackOutcome = "" | "Win" | "Loss" | "Push" | "Blackjack" | "Surrender" | "Bust";
type Soft17Rule = "stands" | "hits";
type HandStatus = "playing" | "awaiting-double-card" | "stood" | "doubled" | "surrendered" | "bust";
type BlackjackResult = {
  action: BlackjackAction | "Bust";
  fallback_action: BlackjackAction | null;
  hand_kind: "hard" | "soft" | "pair" | "bust";
  total: number;
};
type Recommendation = Pick<BlackjackResult, "action" | "fallback_action" | "hand_kind" | "total"> & { cards: BlackjackCard[]; ruleComparison?: string };
type BlackjackHand = {
  actions: BlackjackAction[];
  actualReturn: string;
  cards: CardValue[];
  id: string;
  label: string;
  lastResult: BlackjackResult | null;
  lastRulePreview: RulePreview | null;
  recommendations: Recommendation[];
  startingStake: string;
  outcome: BlackjackOutcome;
  status: HandStatus;
};
type BlackjackRound = {
  archived: boolean;
  dealer: CardValue;
  handNumber: number;
  hands: BlackjackHand[];
  soft17Rule: Soft17Rule;
  activeHandId: string;
  splitOccurred: boolean;
  surrender: boolean;
};
type BlackjackHistoryEntry = {
  dealer: BlackjackCard;
  handNumber: number;
  hands: BlackjackHand[];
  mode: BlackjackSessionMode;
  soft17Rule: Soft17Rule;
  surrender: boolean;
  tableType: BlackjackTableType;
};
type BlackjackSessionDetails = {
  endingBalance: string;
  freeCreditValue: string;
  lastStake: string;
  mode: BlackjackSessionMode;
  startedAt: string;
  startingBalance: string;
  tableType: BlackjackTableType;
  withdrawableResult: string;
};
type StoredBlackjackSession = { details?: BlackjackSessionDetails; history: BlackjackHistoryEntry[]; round: BlackjackRound };

type RulePreview = { kind: "common"; result: BlackjackResult };
type CardTarget = { kind: "dealer" } | { handId: string; index: number; kind: "hand" };
const storageKey = BLACKJACK_SESSION_STORAGE_KEY;
const terminalStatuses: HandStatus[] = ["stood", "doubled", "surrendered", "bust"];
const outcomeChoices: BlackjackOutcome[] = ["Win", "Loss", "Push", "Blackjack"];

function emptyHand(handNumber: number, suffix = "main", startingStake = ""): BlackjackHand {
  return {
    actions: [], actualReturn: "", cards: ["", ""], id: `hand-${handNumber}-${suffix}`,
    label: "Player", lastResult: null, lastRulePreview: null, outcome: "", recommendations: [], startingStake, status: "playing",
  };
}

function emptyRound(handNumber: number, surrender = false, soft17Rule: Soft17Rule = "stands", startingStake = ""): BlackjackRound {
  const hand = emptyHand(handNumber, "main", startingStake);
  return {
    activeHandId: hand.id, archived: false, dealer: "", handNumber,
    hands: [hand], soft17Rule, splitOccurred: false, surrender,
  };
}

function emptySessionDetails(mode: BlackjackSessionMode = "simulation"): BlackjackSessionDetails {
  return {
    endingBalance: "", freeCreditValue: "", lastStake: "", mode, startedAt: "",
    startingBalance: "", tableType: "", withdrawableResult: "",
  };
}

function readSessionDetails(search: URLSearchParams): BlackjackSessionDetails {
  try {
    const parsed = JSON.parse(search.get("blackjackSession") ?? "null") as Partial<BlackjackSessionDetails> | null;
    if (parsed && ["simulation", "free_play", "live_play"].includes(parsed.mode ?? "")) {
      return { ...emptySessionDetails(parsed.mode), ...parsed };
    }
  } catch {
    // Invalid URL state falls back to Simulation.
  }
  return emptySessionDetails();
}

function normalizeHand(hand: BlackjackHand): BlackjackHand {
  return {
    ...hand,
    actualReturn: hand.actualReturn ?? "",
    outcome: hand.outcome ?? (hand.status === "bust" ? "Bust" : hand.status === "surrendered" ? "Surrender" : ""),
    startingStake: hand.startingStake ?? "",
  };
}

function readRound(search: URLSearchParams): BlackjackRound {
  try {
    const parsed = JSON.parse(search.get("blackjack") ?? "null") as Partial<BlackjackRound> & { cards?: unknown[] } | null;
    if (!parsed) return emptyRound(1);
    if (Array.isArray(parsed.hands) && parsed.hands.length > 0) {
      const legacy = parsed as Partial<BlackjackRound> & { hitSoft17?: boolean };
      return {
        ...(parsed as BlackjackRound),
        soft17Rule: legacy.soft17Rule === "hits" || legacy.hitSoft17 ? "hits" : "stands",
        hands: (parsed.hands as BlackjackHand[]).map((hand) => ({ ...normalizeHand(hand), lastRulePreview: hand.lastRulePreview ?? (hand.lastResult ? { kind: "common", result: hand.lastResult } : null) })),
      };
    }
    const legacyCards = Array.isArray(parsed.cards) ? parsed.cards.filter(isBlackjackCard) : [];
    if (isBlackjackCard(parsed.dealer) && legacyCards.length >= 2) {
      const round = emptyRound(1);
      return {
        ...round,
        dealer: parsed.dealer,
        hands: [{ ...round.hands[0], cards: legacyCards }],
        soft17Rule: (parsed as { hitSoft17?: boolean }).hitSoft17 ? "hits" : "stands",
        surrender: Boolean(parsed.surrender),
      };
    }
  } catch {
    // Invalid URL state falls back to a clean calculator hand.
  }
  return emptyRound(1);
}

function normalizeStoredSession(value: StoredBlackjackSession): StoredBlackjackSession {
  const legacyRound = value.round as BlackjackRound & { hitSoft17?: boolean };
  const soft17Rule: Soft17Rule = legacyRound.soft17Rule === "hits" || legacyRound.hitSoft17 ? "hits" : "stands";
  return {
    details: { ...emptySessionDetails(), ...value.details },
    history: value.history.map((entry) => {
      const legacy = entry as BlackjackHistoryEntry & { hitSoft17?: boolean };
      return {
        ...entry,
        hands: entry.hands.map(normalizeHand),
        mode: entry.mode ?? "simulation",
        soft17Rule: legacy.soft17Rule === "hits" || legacy.hitSoft17 ? "hits" : "stands",
        tableType: entry.tableType ?? "",
      };
    }),
    round: {
      ...value.round,
      soft17Rule,
      hands: value.round.hands.map((hand) => ({ ...normalizeHand(hand), lastRulePreview: hand.lastRulePreview ?? (hand.lastResult ? { kind: "common", result: hand.lastResult } : null) })),
    },
  };
}

function historyEntry(round: BlackjackRound, details: BlackjackSessionDetails): BlackjackHistoryEntry {
  return {
    dealer: round.dealer as BlackjackCard,
    handNumber: round.handNumber,
    hands: round.hands,
    mode: details.mode,
    soft17Rule: round.soft17Rule,
    surrender: round.surrender,
    tableType: details.tableType,
  };
}

function handSummary(hand: BlackjackHand) {
  const final = hand.lastResult;
  if (!final) return "Incomplete";
  const kind = final.hand_kind === "bust" ? "Bust" : `${final.hand_kind[0].toUpperCase()}${final.hand_kind.slice(1)} ${final.total}`;
  const action = hand.actions.at(-1) ?? final.action;
  return `${hand.outcome || "Outcome pending"} · ${kind} · ${action}`;
}

function previewResult(value: RulePreview | null): BlackjackResult | null {
  return value?.result ?? null;
}

function committedStake(hand: BlackjackHand): string | null {
  return blackjackCommittedStake(hand.startingStake, hand.actions);
}

function handNet(hand: BlackjackHand): string | null {
  const committed = committedStake(hand);
  return committed && hand.actualReturn ? subtractMoney(hand.actualReturn, committed) : null;
}

function recordedHandNet(history: BlackjackHistoryEntry[]): string | null {
  const hands = history.flatMap((entry) => entry.hands);
  if (hands.length === 0 || hands.some((hand) => !hand.actualReturn || committedStake(hand) === null)) return null;
  return centsToMoney(hands.reduce((total, hand) => {
    return total + moneyToCents(handNet(hand)!.replace(/^-/, ""))! * (handNet(hand)!.startsWith("-") ? BigInt(-1) : BigInt(1));
  }, BigInt(0)));
}

export function BlackjackCalculator({ onState, search }: {
  onState: (params: URLSearchParams) => void;
  search: URLSearchParams;
}) {
  const [round, setRound] = useState<BlackjackRound>(() => readRound(search));
  const [details, setDetails] = useState<BlackjackSessionDetails>(() => readSessionDetails(search));
  const [history, setHistory] = useState<BlackjackHistoryEntry[]>([]);
  const [preview, setPreview] = useState<RulePreview | null>(null);
  const [cardTarget, setCardTarget] = useState<CardTarget>({ kind: "dealer" });
  const [error, setError] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const requestVersion = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const activeHand = round.hands.find((hand) => hand.id === round.activeHandId) ?? round.hands[0];
  const selectedCards = useMemo(() => activeHand.cards.filter(isBlackjackCard), [activeHand.cards]);
  const hasPendingCard = activeHand.cards.some((card) => card === "");
  const previewKey = JSON.stringify([round.dealer, selectedCards, hasPendingCard, round.surrender, round.soft17Rule, activeHand.id, activeHand.status]);
  const hasUrlState = search.has("blackjack");
  const visibleRulePreview = terminalStatuses.includes(activeHand.status) ? activeHand.lastRulePreview : preview;
  const visiblePreview = previewResult(visibleRulePreview);
  const livePlay = details.mode === "live_play";
  const freePlay = details.mode === "free_play";
  const balanceResult = livePlay ? subtractMoney(details.endingBalance, details.startingBalance) : null;
  const handActivityResult = livePlay ? recordedHandNet(history) : null;
  const reconciliationDifference = balanceResult !== null && handActivityResult !== null
    ? subtractSignedMoney(balanceResult, handActivityResult)
    : null;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!hasUrlState) {
        try {
          const stored = JSON.parse(sessionStorage.getItem(storageKey) ?? "null") as StoredBlackjackSession | null;
          if (stored?.round && Array.isArray(stored.history)) {
            const normalized = normalizeStoredSession(stored);
            setRound(normalized.round);
            setHistory(normalized.history);
            setDetails({ ...emptySessionDetails(), ...stored.details });
          }
        } catch {
          // Session storage is optional; calculator state remains usable in memory.
        }
      }
      setDetails((current) => current.startedAt ? current : { ...current, startedAt: new Date().toISOString() });
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hasUrlState]);

  useEffect(() => {
    const clearSession = () => {
      abort.current?.abort();
      requestVersion.current += 1;
      setStorageReady(false);
      setHistory([]);
      setRound(emptyRound(1));
      setDetails(emptySessionDetails());
      setPreview(null);
      setCardTarget({ kind: "dealer" });
    };
    window.addEventListener(AUTHENTICATED_SESSION_ENDED_EVENT, clearSession);
    return () => window.removeEventListener(AUTHENTICATED_SESSION_ENDED_EVENT, clearSession);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ details, history, round } satisfies StoredBlackjackSession));
    } catch {
      // Session storage is optional; calculator state remains usable in memory.
    }
  }, [details, history, round, storageReady]);

  useEffect(() => {
    const shareable = { ...round, archived: false };
    onState(new URLSearchParams({
      family: "blackjack",
      blackjack: JSON.stringify(shareable),
      blackjackSession: JSON.stringify(details),
    }));
  }, [details, onState, round]);

  useEffect(() => {
    abort.current?.abort();
    const current = ++requestVersion.current;
    if (!isBlackjackCard(round.dealer) || selectedCards.length < 2 || hasPendingCard || terminalStatuses.includes(activeHand.status)) {
      return;
    }
    const controller = new AbortController();
    abort.current = controller;
    const timer = window.setTimeout(() => {
      const requestPreview = async (dealerHitsSoft17: boolean) => {
        const response = await fetch(`${apiBaseUrl}/fund-manager/calculators/blackjack/preview`, {
          body: JSON.stringify({
            dealer_card: round.dealer,
            player_cards: selectedCards,
            surrender_allowed: round.surrender && !round.splitOccurred,
            dealer_hits_soft_17: dealerHitsSoft17,
          }),
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          method: "POST",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(formatApiErrorBody(await response.text(), "Unable to calculate blackjack strategy."));
        return response.json() as Promise<BlackjackResult>;
      };
      const resultPromise = requestPreview(round.soft17Rule === "hits")
        .then((result): RulePreview => ({ kind: "common", result }));
      void resultPromise.then((nextPreview) => {
        if (current !== requestVersion.current) return;
        const next = previewResult(nextPreview)!;
        setPreview(nextPreview);
        setError("");
        setRound((existing) => ({
          ...existing,
          hands: existing.hands.map((hand) => {
            if (hand.id !== activeHand.id) return hand;
            const snapshot: Recommendation = {
              ...next,
              cards: selectedCards,
              ruleComparison: undefined,
            };
            const previous = hand.recommendations.at(-1);
            const recommendations = previous && JSON.stringify(previous) === JSON.stringify(snapshot)
              ? hand.recommendations
              : [...hand.recommendations, snapshot];
            const status = next.hand_kind === "bust"
              ? "bust"
              : hand.status === "awaiting-double-card" ? "doubled" : hand.status;
            const outcome = next.hand_kind === "bust" ? "Bust" : hand.outcome;
            return { ...hand, lastResult: next, lastRulePreview: nextPreview, outcome, recommendations, status };
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
  }, [activeHand.id, activeHand.status, hasPendingCard, previewKey, round.dealer, round.soft17Rule, round.splitOccurred, round.surrender, selectedCards]);

  useEffect(() => {
    if (round.archived || !isBlackjackCard(round.dealer) || !round.hands.every((hand) => terminalStatuses.includes(hand.status) && hand.outcome !== "")) return;
    const timer = window.setTimeout(() => {
      setHistory((entries) => entries.some((entry) => entry.handNumber === round.handNumber)
        ? entries
        : [...entries, historyEntry(round, details)]);
      setRound((current) => ({ ...current, archived: true }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [details, round]);

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

  function updateActiveHandMoney(change: Partial<Pick<BlackjackHand, "actualReturn" | "startingStake">>) {
    setRound((current) => ({
      ...current,
      hands: current.hands.map((hand) => hand.id === current.activeHandId ? { ...hand, ...change } : hand),
    }));
    if (round.archived) {
      setHistory((entries) => entries.map((entry) => entry.handNumber !== round.handNumber ? entry : {
        ...entry,
        hands: entry.hands.map((hand) => hand.id === round.activeHandId ? { ...hand, ...change } : hand),
      }));
    }
  }

  function changeSessionMode(mode: string) {
    if (!(["simulation", "free_play", "live_play"] as string[]).includes(mode)) return;
    const nextMode = mode as BlackjackSessionMode;
    const hasHandActivity = history.length > 0 || round.dealer !== "" || round.hands.some((hand) => hand.actions.length > 0 || hand.cards.some(Boolean));
    if (hasHandActivity) {
      setError("Reset Session before changing the Blackjack session mode.");
      return;
    }
    setError("");
    setDetails((current) => ({
      ...emptySessionDetails(nextMode),
      mode: nextMode,
      startedAt: new Date().toISOString(),
      tableType: nextMode === "simulation" ? "" : current.tableType,
    }));
    setRound(emptyRound(1, round.surrender, round.soft17Rule));
  }

  function updateDetail(name: keyof BlackjackSessionDetails, value: string) {
    setDetails((current) => ({ ...current, [name]: value }));
  }

  function chooseCard(index: number, card: CardValue) {
    updateActiveHand((hand) => ({
      ...hand,
      cards: hand.cards.map((current, at) => at === index ? card : current),
      lastResult: null,
      lastRulePreview: null,
      outcome: "",
      status: hand.status === "awaiting-double-card" ? "awaiting-double-card" : "playing",
    }));
    const nextIndex = activeHand.cards.findIndex((current, at) => at > index && current === "");
    if (nextIndex >= 0) setCardTarget({ handId: activeHand.id, index: nextIndex, kind: "hand" });
  }

  function chooseTargetCard(card: CardValue) {
    if (cardTarget.kind === "dealer") {
      updateRound({ dealer: card });
      const firstBlank = activeHand.cards.findIndex((value) => value === "");
      if (firstBlank >= 0) setCardTarget({ handId: activeHand.id, index: firstBlank, kind: "hand" });
      return;
    }
    if (cardTarget.handId !== activeHand.id) return;
    chooseCard(cardTarget.index, card);
  }

  function takeAction(action: BlackjackAction) {
    if (!visiblePreview) return;
    if (action === "Hit") {
      updateActiveHand((hand) => ({ ...hand, actions: [...hand.actions, action], cards: [...hand.cards, ""], lastResult: null }));
      setCardTarget({ handId: activeHand.id, index: activeHand.cards.length, kind: "hand" });
      return;
    }
    if (action === "Double") {
      updateActiveHand((hand) => ({ ...hand, actions: [...hand.actions, action], cards: [...hand.cards, ""], lastResult: null, outcome: "", status: "awaiting-double-card" }));
      setCardTarget({ handId: activeHand.id, index: activeHand.cards.length, kind: "hand" });
      return;
    }
    if (action === "Split") {
      const [first, second] = activeHand.cards;
      const splitRecommendation: Recommendation = {
        ...visiblePreview,
        cards: selectedCards,
        ruleComparison: undefined,
      };
      const firstHand: BlackjackHand = { ...emptyHand(round.handNumber, "split-1", activeHand.startingStake), actions: ["Split"], cards: [first, ""], label: "Split hand 1", recommendations: [splitRecommendation] };
      const secondHand: BlackjackHand = { ...emptyHand(round.handNumber, "split-2", activeHand.startingStake), actions: ["Split"], cards: [second, ""], label: "Split hand 2", recommendations: [splitRecommendation] };
      updateRound({ activeHandId: firstHand.id, hands: [firstHand, secondHand], splitOccurred: true });
      setCardTarget({ handId: firstHand.id, index: 1, kind: "hand" });
      return;
    }
    updateActiveHand((hand) => ({ ...hand, actions: [...hand.actions, action], outcome: action === "Surrender" ? "Surrender" : "", status: action === "Stand" ? "stood" : "surrendered" }));
  }

  function recordOutcome(outcome: BlackjackOutcome) {
    updateActiveHand((hand) => ({ ...hand, outcome }));
  }

  function startFreshHand() {
    abort.current?.abort();
    requestVersion.current += 1;
    setPreview(null);
    setError("");
    setRound(emptyRound(history.length + 1, round.surrender, round.soft17Rule, livePlay ? details.lastStake : ""));
    setCardTarget({ kind: "dealer" });
  }

  const legalActions = (() => {
    if (!visiblePreview || visiblePreview.hand_kind === "bust" || terminalStatuses.includes(activeHand.status)) return [];
    const actions: BlackjackAction[] = ["Hit", "Stand"];
    if (activeHand.cards.length === 2) actions.push("Double");
    if (!round.splitOccurred && activeHand.cards.length === 2 && activeHand.cards[0] === activeHand.cards[1]) actions.push("Split");
    if (!round.splitOccurred && round.surrender && activeHand.cards.length === 2) actions.push("Surrender");
    return actions;
  })();

  const selectedTargetValue = cardTarget.kind === "dealer"
    ? round.dealer
    : round.hands.find((hand) => hand.id === cardTarget.handId)?.cards[cardTarget.index] ?? "";
  const selectedTargetLabel = cardTarget.kind === "dealer"
    ? "Dealer up-card"
    : `${round.hands.find((hand) => hand.id === cardTarget.handId)?.label ?? "Player"} card ${cardTarget.index + 1}`;
  const sessionHasState = history.length > 0
    || round.dealer !== ""
    || round.surrender
    || round.soft17Rule !== "stands"
    || details.mode !== "simulation"
    || round.hands.some((hand) => hand.actions.length > 0 || hand.cards.some((card) => card !== ""));

  return (
    <div className="calculator-panel-shell" data-pd-id="calculators.blackjack">
      <div className="calculator-shell blackjack-calculator-shell">
        <section className="calculator-band calculator-band-primary stack blackjack-control-panel" data-pd-id="calculators.blackjack.controls">
          <div className="blackjack-top-rule-bar">
            <div className="blackjack-session-primary" data-pd-id="calculators.blackjack.session-primary">
              <button className="blackjack-deal-again-action" data-pd-id="calculators.blackjack.deal-again" disabled={!round.archived} onClick={startFreshHand} type="button"><span aria-hidden="true" className="material-symbols-outlined">playing_cards</span><span>Deal Again</span></button>
              <strong aria-live="polite" className="blackjack-session-count">You have played {history.length} {history.length === 1 ? "hand" : "hands"}</strong>
            </div>
            <div className="blackjack-rule-controls" data-pd-id="calculators.blackjack.rule-controls">
              <div className="blackjack-rule-control">
                <span className="blackjack-rule-label">Surrender allowed <ContextHelp label="Help with Surrender allowed" text="Check the game Help or Rules. If surrender is not stated, leave this set to No." /></span>
                <button aria-checked={round.surrender} aria-label="Surrender allowed" className={`material-switch${round.surrender ? " is-selected" : ""}`} data-pd-id="calculators.blackjack.surrender" onClick={() => updateRound({ surrender: !round.surrender })} role="switch" type="button"><span aria-hidden="true" className="material-switch-track"><span className="material-switch-thumb" /></span><span>{round.surrender ? "Yes" : "No"}</span></button>
              </div>
              <div className="blackjack-rule-control">
                <span className="blackjack-rule-label">Dealer hits Soft 17 <ContextHelp label="Help with Dealer hits Soft 17" text="Check whether the dealer hits or stands on Soft 17 in the game Help or Rules. If it is not stated, assume the dealer stands." /></span>
                <button aria-checked={round.soft17Rule === "hits"} aria-label="Dealer hits Soft 17" className={`material-switch${round.soft17Rule === "hits" ? " is-selected" : ""}`} data-pd-id="calculators.blackjack.soft-17" onClick={() => updateRound({ soft17Rule: round.soft17Rule === "hits" ? "stands" : "hits" })} role="switch" type="button"><span aria-hidden="true" className="material-switch-track"><span className="material-switch-thumb" /></span><span>{round.soft17Rule === "hits" ? "Hits" : "Stands"}</span></button>
              </div>
            </div>
            <div className="blackjack-session-reset" data-pd-id="calculators.blackjack.session-reset">
              <button className="button-link icon-text-action" data-pd-id="calculators.blackjack.reset-hand" onClick={startFreshHand} type="button"><span aria-hidden="true" className="material-symbols-outlined">restart_alt</span><span>Reset Hand</span></button>
            </div>
          </div>
        </section>

        <section className="calculator-band calculator-band-secondary stack blackjack-session-mode" data-pd-id="calculators.blackjack.session-mode">
          <div className="blackjack-session-mode-row">
            <label className="field-control blackjack-session-mode-field">
              <span>Session mode</span>
              <select aria-label="Blackjack session mode" data-pd-id="calculators.blackjack.session-mode-control" onChange={(event) => changeSessionMode(event.target.value)} value={details.mode}>
                <option value="simulation">Simulation</option>
                <option value="free_play">Free Play</option>
                <option value="live_play">Live Play</option>
              </select>
            </label>
            <span className="table-chip">{details.mode === "simulation" ? "Not convertible" : "Eligible for later conversion"}</span>
          </div>
          {details.mode !== "simulation" ? <div className="field-control blackjack-table-type-field"><span>Table type (optional)</span><CalculatorSegmentedControl ariaLabel="Blackjack table type" dataPdId="calculators.blackjack.table-type" onChange={(value) => updateDetail("tableType", value)} options={[{ label: "Digital / RNG", value: "digital_rng" }, { label: "Live Dealer", value: "live_dealer" }]} value={details.tableType} /></div> : null}
          {freePlay ? <div className="form-grid financial-input-grid blackjack-session-money-grid">
            <FinancialInputField dataPdId="calculators.blackjack.free-credit" error={moneyInputError(details.freeCreditValue, "Free credit value")} help="Free credit is not user cash stake." id="blackjack-free-credit" label="Free credit / chip value (optional)" onChange={(value) => updateDetail("freeCreditValue", value)} value={details.freeCreditValue} />
            <FinancialInputField dataPdId="calculators.blackjack.withdrawable-result" error={moneyInputError(details.withdrawableResult, "Withdrawable result")} help="Enter only real cash or withdrawable value produced." id="blackjack-withdrawable-result" label="Cash / withdrawable result (optional)" onChange={(value) => updateDetail("withdrawableResult", value)} value={details.withdrawableResult} />
          </div> : null}
          {livePlay ? <FinancialValueReplayGroup><div className="form-grid financial-input-grid blackjack-session-money-grid">
            <FinancialInputField dataPdId="calculators.blackjack.starting-balance" error={moneyInputError(details.startingBalance, "Starting balance")} help="Enter the reviewed balance before play." id="blackjack-starting-balance" label="Session starting balance" onChange={(value) => updateDetail("startingBalance", value)} value={details.startingBalance} />
            <FinancialInputField dataPdId="calculators.blackjack.ending-balance" error={moneyInputError(details.endingBalance, "Ending balance")} help="Enter the reviewed balance after play." id="blackjack-ending-balance" label="Session ending balance" onChange={(value) => updateDetail("endingBalance", value)} value={details.endingBalance} />
            {balanceResult !== null ? <div className="blackjack-session-result"><span>Session result</span>{balanceResult === "0.00" ? <output aria-label="Session result: £ 0.00" className="financial-value financial-value-neutral">£ 0.00</output> : <FinancialValue label="Session result" showPositiveSign value={balanceResult} />}</div> : null}
            {reconciliationDifference !== null && reconciliationDifference !== "0.00" ? <p className="calculator-section-guidance field-span-2">Recorded hand activity differs from balance movement by <FinancialValue showPositiveSign tone="inherit" value={reconciliationDifference} />.</p> : null}
          </div></FinancialValueReplayGroup> : null}
        </section>

        <section className="calculator-band calculator-band-secondary blackjack-table" data-pd-id="calculators.blackjack.table">
          <div className="blackjack-table-side blackjack-dealer-side">
            <h3>Dealer</h3>
            <BlackjackCardSlot active={cardTarget.kind === "dealer"} label="Dealer up-card" onActivate={() => setCardTarget({ kind: "dealer" })} value={round.dealer} />
          </div>
          <div className="blackjack-player-region" data-pd-id="calculators.blackjack.player-region">
            <div className="blackjack-table-side blackjack-player-side">
              <div className="blackjack-player-heading"><h3>Player</h3></div>
              {livePlay ? <div className="form-grid financial-input-grid blackjack-hand-money-grid">
                <FinancialInputField dataPdId="calculators.blackjack.stake" error={moneyInputError(activeHand.startingStake, "Stake")} help="Committed stake follows actions actually recorded." id="blackjack-hand-stake" label="Stake" onChange={(value) => { updateActiveHandMoney({ startingStake: value }); setDetails((current) => ({ ...current, lastStake: value })); }} value={activeHand.startingStake} />
                <FinancialInputField dataPdId="calculators.blackjack.actual-return" error={moneyInputError(activeHand.actualReturn, "Actual return")} help="Include returned stake; no return is inferred from outcome." id="blackjack-actual-return" label="Actual return (optional)" onChange={(value) => updateActiveHandMoney({ actualReturn: value })} value={activeHand.actualReturn} />
                {committedStake(activeHand) !== null ? <div className="blackjack-session-result"><span>Committed stake</span><FinancialValue label="Committed stake" tone="inherit" value={committedStake(activeHand)!} /></div> : null}
              </div> : null}
              {round.hands.length > 1 ? <CalculatorSegmentedControl ariaLabel="Active split hand" dataPdId="calculators.blackjack.split-hands" onChange={(activeHandId) => { updateRound({ activeHandId }); const hand = round.hands.find((item) => item.id === activeHandId); const index = hand?.cards.findIndex((card) => card === "") ?? -1; if (index >= 0) setCardTarget({ handId: activeHandId, index, kind: "hand" }); }} options={round.hands.map((hand) => ({ label: hand.label, value: hand.id }))} value={round.activeHandId} /> : null}
              <div className="blackjack-card-row">
                {activeHand.cards.map((card, index) => <BlackjackCardSlot active={cardTarget.kind === "hand" && cardTarget.handId === activeHand.id && cardTarget.index === index} disabled={terminalStatuses.includes(activeHand.status)} key={`${activeHand.id}-${index}`} label={`${activeHand.label} card ${index + 1}`} onActivate={() => setCardTarget({ handId: activeHand.id, index, kind: "hand" })} value={card} />)}
              </div>
            </div>
            {visiblePreview ? <section className={`blackjack-player-action-panel blackjack-recommendation-${visiblePreview.action.toLowerCase()}`} data-pd-id="calculators.blackjack.result">
              <div className="blackjack-hand-summary">Hand <strong>{visiblePreview.total}</strong> · {visiblePreview.hand_kind.toUpperCase()}</div>
              {visiblePreview.action !== "Bust" && legalActions.includes(visiblePreview.action) ? <button aria-describedby="blackjack-strategy-guidance" aria-label={`Suggested action ${visiblePreview.action}`} className="blackjack-suggested-action" onClick={() => takeAction(visiblePreview.action as BlackjackAction)} type="button"><small>Recommended</small><strong>{visiblePreview.action.toUpperCase()}</strong>{visiblePreview.fallback_action ? <em>Otherwise {visiblePreview.fallback_action}</em> : null}</button> : <div className="blackjack-suggested-action is-static"><small>Current hand</small><strong>{visiblePreview.action.toUpperCase()}</strong></div>}
              {legalActions.length > 0 ? <div aria-label="Action taken" className="blackjack-action-group" role="group">
                {legalActions.map((action) => { const recommended = visiblePreview.action === action; return <button aria-describedby="blackjack-strategy-guidance" className={recommended ? "modal-primary-button" : "button-link"} data-recommended={recommended ? "true" : undefined} key={action} onClick={() => takeAction(action)} type="button"><span aria-hidden="true" className="material-symbols-outlined">{action === "Hit" ? "touch_app" : action === "Stand" ? "front_hand" : action === "Double" ? "double_arrow" : action === "Split" ? "call_split" : "warning"}</span><span>{action}</span>{recommended ? <span className="sr-only"> (recommended)</span> : null}</button>; })}
              </div> : <p className="field-hint">This player hand is complete.</p>}
              {terminalStatuses.includes(activeHand.status) && !["Surrender", "Bust"].includes(activeHand.outcome) ? <div aria-label={`${activeHand.label} outcome`} className="blackjack-outcome-group" role="group"><span>Record outcome</span>{outcomeChoices.map((outcome) => <button aria-pressed={activeHand.outcome === outcome} className={`review-chip${activeHand.outcome === outcome ? " is-selected" : ""}`} key={outcome} onClick={() => recordOutcome(outcome)} type="button">{outcome}</button>)}</div> : activeHand.outcome ? <p className="blackjack-recorded-outcome">Outcome: <strong>{activeHand.outcome}</strong></p> : null}
              <p className="sr-only" id="blackjack-strategy-guidance">Basic strategy minimises the house edge over time; it does not guarantee this hand will win.</p>
            </section> : <section aria-live="polite" className="blackjack-player-action-panel blackjack-result-pending" data-pd-id="calculators.blackjack.result-pending"><p>Choose the dealer card and all visible player cards to see the recommended move.</p></section>}
          </div>
          <div className="blackjack-rank-picker-shell">
            <span className="eyebrow">Choose {selectedTargetLabel}</span>
            <BlackjackRankPicker disabled={terminalStatuses.includes(activeHand.status)} label={`Choose ${selectedTargetLabel}`} onChange={chooseTargetCard} value={selectedTargetValue} />
          </div>
        </section>

        {error ? <p className="error-text" role="alert">{error}</p> : null}
        <section className="calculator-band calculator-band-secondary stack blackjack-history" data-pd-id="calculators.blackjack.history">
          <div className="blackjack-section-heading"><div><span className="eyebrow">Session history</span><h3>Played hands</h3></div><button className="button-link destructive-action" disabled={!sessionHasState} onClick={() => setConfirmClear(true)} type="button"><span aria-hidden="true" className="material-symbols-outlined">delete</span><span>Reset Session</span></button></div>
          {history.length === 0 ? <p className="field-hint">Completed hands appear here for this authenticated browser session only.</p> : <div className="table-scroll"><table className="data-table blackjack-history-table"><thead><tr><th>Hand</th><th>Dealer</th><th>Outcome</th></tr></thead><tbody>{history.map((entry) => <tr key={entry.handNumber}><td data-label="Hand"><details><summary>#{entry.handNumber}</summary><div className="blackjack-history-detail"><span>{entry.mode === "simulation" ? "Simulation" : entry.mode === "free_play" ? "Free Play" : "Live Play"}{entry.tableType ? ` · ${entry.tableType === "digital_rng" ? "Digital / RNG" : "Live Dealer"}` : ""} · Surrender {entry.surrender ? "allowed" : "not allowed"}; Soft 17 rule {entry.soft17Rule === "hits" ? "Hits (H17)" : "Stands (S17)"}.</span>{entry.hands.map((hand) => <span key={hand.id}>{hand.label}: {hand.cards.join(", ")} · Recommended {hand.recommendations.map((item) => item.ruleComparison ?? item.action).join(" → ") || "—"} · Chosen {hand.actions.join(" → ") || "—"} · Outcome {hand.outcome || "not recorded"}{entry.mode === "live_play" ? ` · Stake £${hand.startingStake || "—"} · Committed £${committedStake(hand) ?? "—"} · Return £${hand.actualReturn || "—"}${handNet(hand) === null ? "" : ` · Net £${handNet(hand)}`}` : ""}</span>)}</div></details></td><td data-label="Dealer">{entry.dealer}</td><td data-label="Outcome">{entry.hands.map(handSummary).join("; ")}</td></tr>)}</tbody></table></div>}
          <p className="field-hint">Recorded outcomes describe what happened; they do not grade whether the strategy recommendation was correct.</p>
        </section>

        <details className="calculator-band calculator-band-secondary stack blackjack-how-to" data-pd-id="calculators.blackjack.how-to"><summary>How to use</summary><div className="stack"><ol><li>Choose Simulation, Free Play or Live Play.</li><li>Enable Surrender only if the game rules allow it.</li><li>Enable Dealer hits Soft 17 only if the game rules say H17; otherwise leave it off.</li><li>Enter the dealer&apos;s visible card.</li><li>Enter your first two cards using the fast rank picker.</li><li>Follow or check the recommended basic-strategy move.</li><li>After Hit, enter the next card for the updated recommendation.</li></ol><p className="field-hint">Recommendations minimise the house edge over the long run; they do not guarantee an individual hand. Never take Insurance under this strategy.</p></div></details>
      </div>
      <ConfirmationDialog cancelLabel="Keep history" confirmLabel="Clear History" description="Clear this authenticated browser session's Blackjack hand history and restart the session counter?" onCancel={() => setConfirmClear(false)} onConfirm={() => { try { sessionStorage.removeItem(storageKey); } catch { /* Session storage is optional. */ } setHistory([]); setRound(emptyRound(1)); setDetails({ ...emptySessionDetails(), startedAt: new Date().toISOString() }); setPreview(null); setCardTarget({ kind: "dealer" }); setConfirmClear(false); }} open={confirmClear} title="Clear Blackjack history?" />
    </div>
  );
}
