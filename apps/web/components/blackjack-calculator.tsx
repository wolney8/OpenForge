"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { CalculatorSegmentedControl } from "@/components/calculator-segmented-control";
import { CalculatorConversionDialog } from "@/components/calculator-conversion-dialog";
import { BlackjackCard as BlackjackCardVisual } from "@/components/blackjack-card";
import { BlackjackCardSlot, BlackjackRankPicker } from "@/components/blackjack-rank-picker";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { ContextHelp } from "@/components/context-help";
import { FinancialInputField } from "@/components/financial-input-field";
import { FinancialValue, FinancialValueReplayGroup } from "@/components/financial-value";
import { useBodyScrollLock, useDialogFocusLifecycle } from "@/lib/ledger-ui";
import { apiBaseUrl } from "@/lib/api";
import { formatApiErrorBody } from "@/lib/api-error";
import { AUTHENTICATED_SESSION_ENDED_EVENT, BLACKJACK_SESSION_STORAGE_KEY } from "@/lib/authenticated-session-state";
import { isBlackjackCard, type BlackjackCard, type BlackjackCardValue as CardValue } from "@/lib/blackjack-ranks";
import {
  blackjackCommittedStake,
  blackjackDefaultGrossReturn,
  blackjackPlayLimitStatus,
  blackjackRunningFinancials,
  buildBlackjackSessionSourceSnapshot,
  centsToMoney,
  moneyInputError,
  moneyToCents,
  multiplyMoney,
  subtractMoney,
  subtractSignedMoney,
  type BlackjackActivitySource,
  type BlackjackPlayLimitMode,
  type BlackjackPayoutRule,
  type BlackjackSessionMode,
  type BlackjackTableType,
  type BlackjackSessionSourceSnapshot,
} from "@/lib/blackjack-session";

type BlackjackAction = "Hit" | "Stand" | "Double" | "Split" | "Surrender";
type BlackjackOutcome = "" | "Win" | "Loss" | "Push" | "Blackjack Win" | "Surrender" | "Bust";
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
  actualReturnSource: "" | "calculated" | "entered";
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
  activitySource: BlackjackActivitySource;
  blackjackPayout: BlackjackPayoutRule;
  endingBalance: string;
  freeCreditValue: string;
  lastStake: string;
  mode: BlackjackSessionMode;
  playLimitMode: BlackjackPlayLimitMode;
  playLimitValue: string;
  startedAt: string;
  startingBalance: string;
  tableType: BlackjackTableType;
  withdrawableResult: string;
};
type StoredBlackjackSession = { details?: BlackjackSessionDetails; history: BlackjackHistoryEntry[]; historyOpen?: boolean; round: BlackjackRound };

type RulePreview = { kind: "common"; result: BlackjackResult };
type CardTarget = { kind: "dealer" } | { handId: string; index: number; kind: "hand" };
type BlackjackUndoSnapshot = { cardTarget: CardTarget; history: BlackjackHistoryEntry[]; round: BlackjackRound };
const storageKey = BLACKJACK_SESSION_STORAGE_KEY;
const terminalStatuses: HandStatus[] = ["stood", "doubled", "surrendered", "bust"];
const ordinaryOutcomeChoices: BlackjackOutcome[] = ["Win", "Loss", "Push"];

function emptyHand(handNumber: number, suffix = "main", startingStake = ""): BlackjackHand {
  return {
    actions: [], actualReturn: "", actualReturnSource: "", cards: ["", ""], id: `hand-${handNumber}-${suffix}`,
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
    activitySource: "", blackjackPayout: "", endingBalance: "", freeCreditValue: "", lastStake: "", mode, startedAt: "",
    playLimitMode: "fixed_stake_cap", playLimitValue: "", startingBalance: "",
    tableType: mode === "simulation" ? "" : "digital_rng", withdrawableResult: "",
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
  const legacyOutcome = hand.outcome as BlackjackOutcome | "Blackjack" | undefined;
  return {
    ...hand,
    actualReturn: hand.actualReturn ?? "",
    actualReturnSource: hand.actualReturnSource ?? (hand.actualReturn ? "entered" : ""),
    outcome: legacyOutcome === "Blackjack"
      ? "Blackjack Win"
      : legacyOutcome ?? (hand.status === "bust" ? "Bust" : hand.status === "surrendered" ? "Surrender" : ""),
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
    hands: round.hands.map((hand) => withDefaultReturn(hand, details)),
    mode: details.mode,
    soft17Rule: round.soft17Rule,
    surrender: round.surrender,
    tableType: details.tableType,
  };
}

function handSummary(hand: BlackjackHand) {
  const final = hand.lastResult;
  if (!final) return "Incomplete";
  const kind = final.hand_kind === "bust" ? "BUST" : `${final.hand_kind.toUpperCase()} ${final.total}`;
  const action = hand.actions.at(-1) ?? final.action;
  return `${kind} · ${action.toUpperCase()} · ${(hand.outcome || "Outcome pending").toUpperCase()}`;
}

function isNaturalBlackjack(hand: BlackjackHand) {
  if (hand.cards.length !== 2) return false;
  const cards = hand.cards.filter(isBlackjackCard);
  return cards.length === 2 && cards.includes("A") && cards.some((card) => ["10", "J", "Q", "K"].includes(card));
}

function outcomeChoicesForHand(hand: BlackjackHand, splitOccurred: boolean): BlackjackOutcome[] {
  return !splitOccurred && isNaturalBlackjack(hand)
    ? [...ordinaryOutcomeChoices, "Blackjack Win"]
    : ordinaryOutcomeChoices;
}

function outcomeToneClass(outcome: BlackjackOutcome) {
  if (outcome === "Win") return "is-win";
  if (outcome === "Loss" || outcome === "Bust") return "is-loss";
  if (outcome === "Blackjack Win") return "is-blackjack";
  if (outcome === "Surrender") return "is-surrender";
  return "is-push";
}

function actionIcon(action: BlackjackAction | "Bust") {
  if (action === "Hit") return "touch_app";
  if (action === "Stand") return "front_hand";
  if (action === "Double") return "double_arrow";
  if (action === "Split") return "call_split";
  if (action === "Bust") return "dangerous";
  return "warning";
}

function previewResult(value: RulePreview | null): BlackjackResult | null {
  return value?.result ?? null;
}

function committedStake(hand: BlackjackHand): string | null {
  return blackjackCommittedStake(hand.startingStake, hand.actions);
}

function withDefaultReturn(hand: BlackjackHand, details: BlackjackSessionDetails): BlackjackHand {
  if (details.mode === "simulation" || hand.actualReturnSource === "entered" || !hand.outcome) return hand;
  const committed = committedStake(hand);
  if (committed === null) return hand;
  const derived = blackjackDefaultGrossReturn(committed, hand.outcome, details.blackjackPayout);
  return derived === null ? hand : { ...hand, actualReturn: derived, actualReturnSource: "calculated" };
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

function historyFinancials(history: BlackjackHistoryEntry[]) {
  return blackjackRunningFinancials(history.flatMap((entry) => entry.hands.map((hand) => ({
    actual_actions: hand.actions,
    actual_return: hand.actualReturn || null,
    cards: hand.cards,
    classification: hand.lastResult?.hand_kind ?? null,
    committed_stake: committedStake(hand),
    label: hand.label,
    outcome: hand.outcome,
    recommendation_sequence: hand.recommendations.map((item) => item.action),
    starting_stake: hand.startingStake || null,
    total: hand.lastResult?.total ?? null,
  }))));
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
  const [sessionModeError, setSessionModeError] = useState("");
  const [undoStack, setUndoStack] = useState<BlackjackUndoSnapshot[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [conversionSnapshot, setConversionSnapshot] = useState<BlackjackSessionSourceSnapshot | null>(null);
  const [conversionBusy, setConversionBusy] = useState(false);
  const [sessionSetupOpen, setSessionSetupOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [lastHandOpen, setLastHandOpen] = useState(true);
  const [lastHandInteracted, setLastHandInteracted] = useState(false);
  const [pendingNextHandAction, setPendingNextHandAction] = useState<"rebet_deal" | "double_deal" | null>(null);
  const requestVersion = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const sessionSetupRef = useRef<HTMLElement | null>(null);
  const outcomeSubmission = useRef("");
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
  const runningFinancials = useMemo(() => historyFinancials(history), [history]);
  const reconciliationDifference = balanceResult !== null && handActivityResult !== null
    ? subtractSignedMoney(balanceResult, handActivityResult)
    : null;
  const lastHand = history.at(-1) ?? null;
  const currentPlayLimit = blackjackPlayLimitStatus({
    grossStaked: runningFinancials.grossStaked,
    limit: details.playLimitValue,
    mode: details.playLimitMode,
    net: runningFinancials.net,
    nextStake: activeHand.startingStake || details.lastStake,
    returnsComplete: runningFinancials.returnsComplete,
  });
  const remainingLossBuffer = currentPlayLimit.remainingLossBuffer;
  const nextStakeExceedsLimit = currentPlayLimit.warning;
  const lastAction = activeHand.actions.at(-1) ?? null;
  const waitingState = activeHand.status === "awaiting-double-card"
    ? "Waiting for final player card"
    : terminalStatuses.includes(activeHand.status) && !activeHand.outcome
      ? "Waiting for outcome"
      : hasPendingCard && lastAction === "Hit"
        ? `Waiting for Player Card ${activeHand.cards.findIndex((card) => card === "") + 1}`
        : hasPendingCard && round.splitOccurred
          ? `Waiting for next card on ${activeHand.label.replace("Split hand", "Hand")}`
          : "";
  const sessionSetupSummary = details.mode === "simulation" ? "" : [
    details.activitySource === "own_cash" ? "Own cash" : details.activitySource === "promotion" ? "Promotion" : details.activitySource === "free_credit" ? "Free credit" : "Source not set",
    details.playLimitValue ? `£${details.playLimitValue} limit` : "No play limit",
  ].join(" · ");

  useDialogFocusLifecycle(sessionSetupOpen, sessionSetupRef);
  useBodyScrollLock(sessionSetupOpen);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(sessionStorage.getItem(storageKey) ?? "null") as StoredBlackjackSession | null;
        if (stored?.round && Array.isArray(stored.history)) {
          const normalized = normalizeStoredSession(stored);
          setHistory(normalized.history);
          setHistoryOpen(stored.historyOpen ?? true);
          if (!hasUrlState) {
            setRound(normalized.round);
            setDetails({ ...emptySessionDetails(), ...stored.details });
          }
        }
      } catch {
        // Session storage is optional; calculator state remains usable in memory.
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
      setSessionModeError("");
      setUndoStack([]);
      setHistoryOpen(true);
      setLastHandOpen(true);
      setLastHandInteracted(false);
      setPendingNextHandAction(null);
      setCardTarget({ kind: "dealer" });
    };
    window.addEventListener(AUTHENTICATED_SESSION_ENDED_EVENT, clearSession);
    return () => window.removeEventListener(AUTHENTICATED_SESSION_ENDED_EVENT, clearSession);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ details, history, historyOpen, round } satisfies StoredBlackjackSession));
    } catch {
      // Session storage is optional; calculator state remains usable in memory.
    }
  }, [details, history, historyOpen, round, storageReady]);

  useEffect(() => {
    if (!sessionModeError) return;
    const timer = window.setTimeout(() => setSessionModeError(""), 4000);
    return () => window.clearTimeout(timer);
  }, [sessionModeError]);

  useEffect(() => {
    if (!lastHand || !lastHandOpen || lastHandInteracted) return;
    const timer = window.setTimeout(() => setLastHandOpen(false), 4500);
    return () => window.clearTimeout(timer);
  }, [lastHand, lastHandInteracted, lastHandOpen]);

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
      setLastHandOpen(true);
      setLastHandInteracted(false);
      setRound(emptyRound(round.handNumber + 1, round.surrender, round.soft17Rule, details.mode !== "simulation" ? details.lastStake : ""));
      setPreview(null);
      setCardTarget({ kind: "dealer" });
    }, round.hands.some((hand) => hand.status === "bust") ? 1300 : 0);
    return () => window.clearTimeout(timer);
  }, [details, round]);

  useEffect(() => () => abort.current?.abort(), []);

  function rememberCurrentRound() {
    setUndoStack((entries) => [...entries.slice(-19), { cardTarget, history, round }]);
  }

  function updateRound(change: Partial<BlackjackRound>, reversible = true) {
    if (reversible) rememberCurrentRound();
    abort.current?.abort();
    requestVersion.current += 1;
    setPreview(null);
    setError("");
    setRound((current) => ({ ...current, ...change, archived: false }));
  }

  function updateActiveHand(change: (hand: BlackjackHand) => BlackjackHand) {
    rememberCurrentRound();
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

  function updateActiveHandMoney(change: Partial<Pick<BlackjackHand, "actualReturn" | "actualReturnSource" | "startingStake">>) {
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
      setSessionModeError("Reset session before changing the Blackjack session mode.");
      return;
    }
    setSessionModeError("");
    setDetails((current) => ({
      ...emptySessionDetails(nextMode),
      mode: nextMode,
      startedAt: new Date().toISOString(),
      tableType: nextMode === "simulation" ? "" : current.tableType || "digital_rng",
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

  function clearPlayerCard(index: number) {
    updateActiveHand((hand) => {
      const baseActions = round.splitOccurred ? 1 : 0;
      const preservedActions = hand.actions.slice(0, baseActions + Math.max(0, index - 1));
      return {
        ...hand,
        actions: preservedActions,
        cards: hand.cards.slice(0, index + 1).map((card, at) => at === index ? "" : card),
        lastResult: null,
        lastRulePreview: null,
        outcome: "",
        recommendations: hand.recommendations.filter((item) => item.cards.length <= index),
        status: preservedActions.at(-1) === "Double" ? "awaiting-double-card" : "playing",
      };
    });
    setCardTarget({ handId: activeHand.id, index, kind: "hand" });
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
    const submissionKey = `${round.handNumber}:${activeHand.id}`;
    if (outcomeSubmission.current === submissionKey) return;
    outcomeSubmission.current = submissionKey;
    rememberCurrentRound();

    abort.current?.abort();
    requestVersion.current += 1;
    setPreview(null);
    setError("");
    const completedRound: BlackjackRound = {
      ...round,
      archived: false,
      hands: round.hands.map((hand) => hand.id === round.activeHandId ? { ...hand, outcome } : hand),
    };
    const allHandsComplete = completedRound.hands.every((hand) => terminalStatuses.includes(hand.status) && hand.outcome !== "");
    if (!allHandsComplete) {
      setRound(completedRound);
      return;
    }

    setHistory((entries) => entries.some((entry) => entry.handNumber === completedRound.handNumber)
      ? entries
      : [...entries, historyEntry(completedRound, details)]);
    setLastHandOpen(true);
    setLastHandInteracted(false);
    setPendingNextHandAction(null);
    setRound(emptyRound(completedRound.handNumber + 1, completedRound.surrender, completedRound.soft17Rule, details.mode !== "simulation" ? details.lastStake : ""));
    setCardTarget({ kind: "dealer" });
  }

  function undoLastStep() {
    const snapshot = undoStack.at(-1);
    if (!snapshot) return;
    abort.current?.abort();
    requestVersion.current += 1;
    outcomeSubmission.current = "";
    setUndoStack((entries) => entries.slice(0, -1));
    if (snapshot.history.length !== history.length) {
      setLastHandOpen(true);
      setLastHandInteracted(false);
    }
    setHistory(snapshot.history);
    setRound(snapshot.round);
    setCardTarget(snapshot.cardTarget);
    const restoredHand = snapshot.round.hands.find((hand) => hand.id === snapshot.round.activeHandId) ?? snapshot.round.hands[0];
    setPreview(restoredHand.lastRulePreview);
    setError("");
  }

  function startFreshHand() {
    abort.current?.abort();
    requestVersion.current += 1;
    setPreview(null);
    setError("");
    setUndoStack([]);
    setRound(emptyRound(history.length + 1, round.surrender, round.soft17Rule, details.mode !== "simulation" ? details.lastStake : ""));
    setCardTarget({ kind: "dealer" });
  }

  function exceedsPlayLimit(stake: string) {
    return blackjackPlayLimitStatus({
      grossStaked: runningFinancials.grossStaked, limit: details.playLimitValue,
      mode: details.playLimitMode, net: runningFinancials.net, nextStake: stake,
      returnsComplete: runningFinancials.returnsComplete,
    }).warning;
  }

  function prepareNextHand(kind: "rebet" | "rebet_deal" | "double_deal", acknowledged = false) {
    const previousStake = lastHand?.hands[0]?.startingStake || details.lastStake;
    const nextStake = kind === "double_deal" ? multiplyMoney(previousStake, 2) ?? previousStake : previousStake;
    if (kind !== "rebet" && exceedsPlayLimit(nextStake) && !acknowledged) {
      setPendingNextHandAction(kind);
      return;
    }
    setPendingNextHandAction(null);
    setDetails((current) => ({ ...current, lastStake: nextStake }));
    setRound((current) => ({
      ...emptyRound(current.handNumber, current.surrender, current.soft17Rule, nextStake),
      handNumber: current.handNumber,
    }));
    if (kind !== "rebet") setCardTarget({ kind: "dealer" });
  }

  async function openCasinoConversion() {
    if (details.mode === "simulation" || history.length === 0 || !details.activitySource) return;
    setConversionBusy(true);
    try {
      const snapshot = await buildBlackjackSessionSourceSnapshot({
        activitySource: details.activitySource,
        blackjackPayout: details.blackjackPayout,
        endedAt: new Date().toISOString(),
        endingBalance: details.endingBalance,
        freeCreditValue: details.freeCreditValue,
        hands: history.map((entry) => ({
          dealer_card: entry.dealer,
          hand_number: entry.handNumber,
          hands: entry.hands.map((hand) => ({
            actual_actions: [...hand.actions],
            actual_return: hand.actualReturn || null,
            actual_return_source: hand.actualReturnSource || null,
            cards: hand.cards.filter(isBlackjackCard),
            classification: hand.lastResult?.hand_kind ?? null,
            committed_stake: committedStake(hand),
            label: hand.label,
            outcome: hand.outcome,
            net_result: handNet(hand),
            recommendation_sequence: hand.recommendations.map((item) => item.ruleComparison ?? item.action),
            starting_stake: hand.startingStake || null,
            total: hand.lastResult?.total ?? null,
          })),
        })),
        mode: details.mode,
        recordedHandNet: handActivityResult,
        playLimitMode: details.playLimitMode,
        playLimitValue: details.playLimitValue,
        soft17Rule: round.soft17Rule,
        startedAt: details.startedAt,
        startingBalance: details.startingBalance,
        surrenderAllowed: round.surrender,
        tableType: details.tableType,
        withdrawableResult: details.withdrawableResult,
      });
      setConversionSnapshot(snapshot);
    } finally { setConversionBusy(false); }
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
  const undoControl = undoStack.length > 0 ? (
    <button aria-label="Undo last Blackjack action" className="icon-button blackjack-undo-action" data-pd-id="calculators.blackjack.undo" onClick={undoLastStep} title="Undo last action" type="button">
      <span aria-hidden="true" className="material-symbols-outlined">undo</span>
    </button>
  ) : null;

  return (
    <div className="calculator-panel-shell" data-pd-id="calculators.blackjack">
      <div className="calculator-shell blackjack-calculator-shell">
        <section className="calculator-band calculator-band-primary stack blackjack-control-panel" data-pd-id="calculators.blackjack.controls">
          <div className="blackjack-top-rule-bar">
            <div className="blackjack-session-mode-cell" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSessionModeError(""); }}>
              <div className="field-control blackjack-session-mode-field">
                <label htmlFor="blackjack-session-mode">Session mode</label>
                <select aria-describedby={sessionModeError ? "blackjack-session-mode-error" : undefined} aria-invalid={sessionModeError ? "true" : undefined} aria-label="Blackjack session mode" data-pd-id="calculators.blackjack.session-mode-control" id="blackjack-session-mode" onChange={(event) => changeSessionMode(event.target.value)} value={details.mode}>
                  <option value="simulation">Simulation</option><option value="free_play">Free Play</option><option value="live_play">Live Play</option>
                </select>
                {sessionModeError ? <span className="blackjack-session-mode-error-row"><span className="error-text" id="blackjack-session-mode-error" role="alert">{sessionModeError}</span><button aria-label="Reset session" className="icon-button" onClick={() => setConfirmClear(true)} title="Reset session" type="button"><span aria-hidden="true" className="material-symbols-outlined">restart_alt</span></button></span> : null}
              </div>
              {details.mode !== "simulation" ? <div className="blackjack-session-setup-trigger"><button aria-haspopup="dialog" className="button-link icon-text-action" data-pd-id="calculators.blackjack.session-setup.open" onClick={() => setSessionSetupOpen(true)} type="button"><span aria-hidden="true" className="material-symbols-outlined">tune</span><span>Session Setup</span></button><small>{sessionSetupSummary}</small></div> : null}
            </div>
            <div className="blackjack-session-reset" data-pd-id="calculators.blackjack.session-reset">
              <button className="button-link icon-text-action" data-pd-id="calculators.blackjack.reset-hand" onClick={startFreshHand} type="button"><span aria-hidden="true" className="material-symbols-outlined">restart_alt</span><span>Reset Hand</span></button>
            </div>
            <strong aria-live="polite" className="blackjack-session-count">You have played {history.length} {history.length === 1 ? "hand" : "hands"}</strong>
            <div className="blackjack-rule-control blackjack-rule-surrender" data-pd-id="calculators.blackjack.rule-controls">
                <span className="blackjack-rule-label">Surrender allowed <ContextHelp label="Help with Surrender allowed" text="Check the game Help or Rules. If surrender is not stated, leave this set to No." /></span>
                <button aria-checked={round.surrender} aria-label="Surrender allowed" className={`material-switch${round.surrender ? " is-selected" : ""}`} data-pd-id="calculators.blackjack.surrender" onClick={() => updateRound({ surrender: !round.surrender })} role="switch" type="button"><span aria-hidden="true" className="material-switch-track"><span className="material-switch-thumb" /></span><span>{round.surrender ? "Yes" : "No"}</span></button>
            </div>
            <div className="blackjack-rule-control blackjack-rule-soft-17">
                <span className="blackjack-rule-label">Dealer hits Soft 17 <ContextHelp label="Help with Dealer hits Soft 17" text="Check whether the dealer hits or stands on Soft 17 in the game Help or Rules. If it is not stated, assume the dealer stands." /></span>
                <button aria-checked={round.soft17Rule === "hits"} aria-label="Dealer hits Soft 17" className={`material-switch${round.soft17Rule === "hits" ? " is-selected" : ""}`} data-pd-id="calculators.blackjack.soft-17" onClick={() => updateRound({ soft17Rule: round.soft17Rule === "hits" ? "stands" : "hits" })} role="switch" type="button"><span aria-hidden="true" className="material-switch-track"><span className="material-switch-thumb" /></span><span>{round.soft17Rule === "hits" ? "Hits" : "Stands"}</span></button>
            </div>
          </div>
        </section>

        <section className="calculator-band calculator-band-secondary blackjack-session-mode" data-pd-id="calculators.blackjack.session-mode">
          <div className="blackjack-session-control-grid">
            <span className="table-chip blackjack-conversion-status">{details.mode === "simulation" ? "Not convertible" : "Eligible for later conversion"}</span>
            {details.mode !== "simulation" ? <>
              <FinancialInputField dataPdId="calculators.blackjack.stake" error={moneyInputError(activeHand.startingStake, "Stake")} help={freePlay ? "Reference chip value for this hand; it is not a cash stake." : "Committed stake follows actions actually recorded."} id="blackjack-hand-stake" label={freePlay ? "Chip stake" : "Player stake"} onChange={(value) => { updateActiveHandMoney({ startingStake: value }); setDetails((current) => ({ ...current, lastStake: value })); }} value={activeHand.startingStake} />
              <FinancialInputField dataPdId="calculators.blackjack.actual-return" error={moneyInputError(activeHand.actualReturn, "Actual return")} help={freePlay ? "Returned chip value; this is not withdrawable cash." : "A manually entered return overrides the outcome-derived reference."} id="blackjack-actual-return" label={freePlay ? "Chip return (optional)" : "Actual return (optional)"} onChange={(value) => updateActiveHandMoney({ actualReturn: value, actualReturnSource: value ? "entered" : "" })} value={activeHand.actualReturn} />
              <FinancialValueReplayGroup><div className="blackjack-session-summary-row">
                <div className="blackjack-session-result"><span>{freePlay ? "Gross chips staked" : "Gross staked"}</span><FinancialValue label={freePlay ? "Gross chips staked" : "Gross staked"} tone="inherit" value={runningFinancials.grossStaked} /></div>
                <div className="blackjack-session-result"><span>{freePlay ? "Gross chip returns" : "Gross returned"}</span>{runningFinancials.grossReturned === null ? <strong>Incomplete</strong> : <FinancialValue label={freePlay ? "Gross chip returns" : "Gross returned"} tone="inherit" value={runningFinancials.grossReturned} />}</div>
                <div className="blackjack-session-result"><span>{freePlay ? "Net chip result" : "Net P&L"}</span>{runningFinancials.net === null ? <strong>Incomplete</strong> : <FinancialValue label={freePlay ? "Net chip result" : "Net P and L"} showPositiveSign value={runningFinancials.net} />}</div>
                {livePlay ? <div className="blackjack-session-result"><span>Remaining buffer</span>{remainingLossBuffer === null ? <strong aria-label="Remaining buffer unavailable">—</strong> : <FinancialValue label="Remaining buffer" tone="inherit" value={remainingLossBuffer} />}</div> : null}
                {livePlay && details.playLimitValue && details.playLimitMode === "use_winnings" && !runningFinancials.returnsComplete ? <p className="calculator-section-guidance is-warning">Enter Actual Return for every completed hand before Use winnings can calculate the remaining loss buffer.</p> : null}
                {livePlay && nextStakeExceedsLimit ? <p className="calculator-section-guidance is-warning">The next stake exceeds the current session play limit. You can acknowledge this before dealing.</p> : null}
              </div></FinancialValueReplayGroup>
            </> : null}
          </div>
        </section>

        <section className="calculator-band calculator-band-secondary blackjack-table" data-pd-id="calculators.blackjack.table">
          {visiblePreview ? <section className={`blackjack-player-action-panel blackjack-recommendation-${visiblePreview.action.toLowerCase()}${terminalStatuses.includes(activeHand.status) ? " is-complete" : ""}`} data-pd-id="calculators.blackjack.result">
            {undoControl}
            <div className="blackjack-banner-primary">
              <div className="blackjack-hand-summary">Hand <strong>{visiblePreview.total}</strong> · {visiblePreview.hand_kind.toUpperCase()}</div>
              {visiblePreview.action !== "Bust" && legalActions.includes(visiblePreview.action) ? <button aria-describedby="blackjack-strategy-guidance" aria-label={`Suggested action ${visiblePreview.action}`} className="blackjack-suggested-action" onClick={() => takeAction(visiblePreview.action as BlackjackAction)} type="button"><small>Recommended</small><span className="blackjack-action-value"><span aria-hidden="true" className="material-symbols-outlined">{actionIcon(visiblePreview.action)}</span><strong>{visiblePreview.action.toUpperCase()}</strong></span>{visiblePreview.fallback_action ? <em>Otherwise {visiblePreview.fallback_action}</em> : null}</button> : <div className="blackjack-suggested-action is-static"><small>Current hand</small><span className="blackjack-action-value"><span aria-hidden="true" className="material-symbols-outlined">{actionIcon(visiblePreview.action)}</span><strong>{visiblePreview.action.toUpperCase()}</strong></span></div>}
              {terminalStatuses.includes(activeHand.status) && !activeHand.outcome ? <div aria-label={`${activeHand.label} outcome`} className="blackjack-outcome-group" role="group">{(activeHand.status === "bust" ? ["Bust"] : activeHand.status === "surrendered" ? ["Surrender"] : outcomeChoicesForHand(activeHand, round.splitOccurred)).map((outcome) => <button className={`review-chip blackjack-outcome-button ${outcomeToneClass(outcome as BlackjackOutcome)}`} key={outcome} onClick={() => recordOutcome(outcome as BlackjackOutcome)} type="button">{outcome}</button>)}</div> : activeHand.outcome ? <p className="blackjack-recorded-outcome">Outcome: <strong>{activeHand.outcome}</strong></p> : null}
            </div>
            <div className="blackjack-banner-secondary">
              {lastAction ? <strong className="blackjack-status-last-action">Last action · {lastAction}</strong> : null}
              {waitingState ? <span className="blackjack-status-waiting">{waitingState}</span> : null}
              {legalActions.length === 0 ? <p className="blackjack-status-complete">This player hand is complete.</p> : null}
              {legalActions.length > 0 ? <div aria-label="Action taken" className="blackjack-action-group" role="group">
                {legalActions.map((action) => { const recommended = visiblePreview.action === action; return <button aria-describedby="blackjack-strategy-guidance" className={recommended ? "modal-primary-button" : "button-link"} data-recommended={recommended ? "true" : undefined} key={action} onClick={() => takeAction(action)} type="button"><span aria-hidden="true" className="material-symbols-outlined">{actionIcon(action)}</span><span>{action}</span>{recommended ? <span className="sr-only"> (recommended)</span> : null}</button>; })}
              </div> : null}
            </div>
            <p className="sr-only" id="blackjack-strategy-guidance">Basic strategy minimises the house edge over time; it does not guarantee this hand will win.</p>
          </section> : <section aria-live="polite" className="blackjack-player-action-panel blackjack-result-pending" data-pd-id="calculators.blackjack.result-pending">{undoControl}{lastAction || waitingState ? <div className="blackjack-last-action-state">{lastAction ? <strong>Last action · {lastAction}</strong> : null}{waitingState ? <span>{waitingState}</span> : null}</div> : <p>Choose the dealer card and all visible player cards to see the recommended move.</p>}</section>}
          {lastHand ? <details aria-label={`Last hand ${lastHand.handNumber}`} className="calculator-band calculator-band-secondary blackjack-last-hand blackjack-disclosure" data-pd-id="calculators.blackjack.last-hand" onToggle={(event) => setLastHandOpen(event.currentTarget.open)} open={lastHandOpen}><summary onClick={() => setLastHandInteracted(true)}><span><span className="eyebrow">Last hand #{lastHand.handNumber}</span><strong>Previous round</strong></span><span aria-hidden="true" className="material-symbols-outlined">expand_more</span></summary><div className="blackjack-last-hand-content"><div className="blackjack-last-hand-card-line"><div className="blackjack-last-hand-card-group"><span>Dealer up-card</span><BlackjackCardVisual ariaLabel={`Last hand dealer up-card, ${lastHand.dealer}`} className="blackjack-last-hand-card" disabled onClick={() => undefined} rank={lastHand.dealer} /></div>{lastHand.hands.map((hand) => <div className="blackjack-last-hand-card-group" key={hand.id}><span>{hand.label}</span><div className="blackjack-last-hand-player-cards">{hand.cards.filter(isBlackjackCard).map((card, index) => <BlackjackCardVisual ariaLabel={`Last hand ${hand.label} card ${index + 1}, ${card}`} className="blackjack-last-hand-card" disabled key={`${hand.id}-${index}`} onClick={() => undefined} rank={card} />)}</div></div>)}</div><div className="blackjack-last-hand-metadata">{lastHand.hands.map((hand) => <small key={hand.id}>{hand.lastResult ? `${lastHand.hands.length > 1 ? `${hand.label} · ` : ""}${hand.lastResult.hand_kind.toUpperCase()} ${hand.lastResult.total}` : "—"}<span>Last action: {hand.actions.at(-1) ?? "—"}</span><span>Outcome: {hand.outcome || "—"}</span>{lastHand.mode !== "simulation" ? <><span>{hand.startingStake ? `£${hand.startingStake} staked` : "Stake —"}</span><span>{hand.actualReturn ? `£${hand.actualReturn} returned` : "Return —"}</span>{handNet(hand) !== null ? <span>Net £{handNet(hand)}</span> : null}</> : null}</small>)}</div>{lastHand.mode !== "simulation" ? <div className="blackjack-next-hand-controls"><span className="eyebrow">Next hand</span><div className="blackjack-action-group"><button className="button-link" onClick={() => prepareNextHand("rebet")} type="button">Rebet</button><button className="button-link" onClick={() => prepareNextHand("rebet_deal")} type="button">Rebet &amp; Deal</button><button className="button-link" onClick={() => prepareNextHand("double_deal")} type="button">Double &amp; Deal</button></div>{pendingNextHandAction ? <div className="blackjack-limit-acknowledgement" role="alert"><span>This next hand would exceed the session play limit.</span><button className="modal-primary-button" onClick={() => prepareNextHand(pendingNextHandAction, true)} type="button">Continue anyway</button></div> : null}</div> : null}</div></details> : null}
          <div className="blackjack-table-side blackjack-dealer-side">
            <h3>Dealer</h3>
            <BlackjackCardSlot active={cardTarget.kind === "dealer"} label="Dealer up-card" onActivate={() => setCardTarget({ kind: "dealer" })} value={round.dealer} />
          </div>
          <div className="blackjack-table-side blackjack-player-side">
            <div className="blackjack-player-heading"><h3>Player</h3><button className="blackjack-deal-again-action" data-pd-id="calculators.blackjack.deal-again" disabled={round.dealer === "" && round.hands.every((hand) => hand.cards.every((card) => card === ""))} onClick={startFreshHand} type="button"><span aria-hidden="true" className="material-symbols-outlined">playing_cards</span><span>Deal Again</span></button></div>
            {round.hands.length > 1 ? <CalculatorSegmentedControl ariaLabel="Active split hand" dataPdId="calculators.blackjack.split-hands" onChange={(activeHandId) => { updateRound({ activeHandId }, false); const hand = round.hands.find((item) => item.id === activeHandId); const index = hand?.cards.findIndex((card) => card === "") ?? -1; if (index >= 0) setCardTarget({ handId: activeHandId, index, kind: "hand" }); }} options={round.hands.map((hand) => ({ label: hand.label, value: hand.id }))} value={round.activeHandId} /> : null}
            <div className="blackjack-card-row">
              {activeHand.cards.map((card, index) => <BlackjackCardSlot active={cardTarget.kind === "hand" && cardTarget.handId === activeHand.id && cardTarget.index === index} disabled={terminalStatuses.includes(activeHand.status)} key={`${activeHand.id}-${index}`} label={`${activeHand.label} card ${index + 1}`} onActivate={() => setCardTarget({ handId: activeHand.id, index, kind: "hand" })} onClear={isBlackjackCard(card) ? () => clearPlayerCard(index) : undefined} value={card} />)}
            </div>
          </div>
          <div className={`blackjack-rank-picker-shell${waitingState && cardTarget.kind === "hand" ? " is-waiting" : ""}`}>
            <span className="eyebrow">Choose {selectedTargetLabel}</span>
            <BlackjackRankPicker disabled={terminalStatuses.includes(activeHand.status)} label={`Choose ${selectedTargetLabel}`} onChange={chooseTargetCard} value={selectedTargetValue} />
          </div>
        </section>

        {error ? <p className="error-text" role="alert">{error}</p> : null}
        {details.mode !== "simulation" ? <div className="tracker-nav"><button className="modal-primary-button icon-text-action" data-pd-id="calculators.blackjack.save-activity" disabled={conversionBusy || history.length === 0 || !details.activitySource || (details.mode === "live_play" ? balanceResult === null : !details.withdrawableResult)} onClick={() => void openCasinoConversion()} type="button"><span aria-hidden="true" className="material-symbols-outlined">save</span><span>{conversionBusy ? "Preparing…" : "Save as Casino activity"}</span></button></div> : null}
        <details className="calculator-band calculator-band-secondary blackjack-history blackjack-disclosure" data-pd-id="calculators.blackjack.history" onToggle={(event) => setHistoryOpen(event.currentTarget.open)} open={historyOpen}>
          <summary><span><span className="eyebrow">Session history</span><strong>Played hands</strong></span><span aria-hidden="true" className="material-symbols-outlined">expand_more</span></summary>
          <div className="stack blackjack-history-content"><div className="blackjack-section-heading"><span className="field-hint">Completed hands remain available for this authenticated browser session.</span><button className="button-link destructive-action" disabled={!sessionHasState} onClick={() => setConfirmClear(true)} type="button"><span aria-hidden="true" className="material-symbols-outlined">delete</span><span>Reset Session</span></button></div>
            {history.length === 0 ? <p className="field-hint">Completed hands appear here for this authenticated browser session only.</p> : <div className="table-scroll"><table className="data-table blackjack-history-table"><thead><tr><th>Hand</th><th>Dealer</th><th>Outcome</th></tr></thead><tbody>{history.map((entry) => <tr key={entry.handNumber}><td data-label="Hand"><details><summary>#{entry.handNumber}</summary><div className="blackjack-history-detail"><span>{entry.mode === "simulation" ? "Simulation" : entry.mode === "free_play" ? "Free Play" : "Live Play"}{entry.tableType ? ` · ${entry.tableType === "digital_rng" ? "Digital / RNG" : "Live Dealer"}` : ""} · Surrender {entry.surrender ? "allowed" : "not allowed"}; Soft 17 rule {entry.soft17Rule === "hits" ? "Hits (H17)" : "Stands (S17)"}.</span>{entry.hands.map((hand) => <div className="blackjack-history-hand-detail" key={hand.id}><strong>{handSummary(hand)}</strong><span>{hand.label}: {hand.cards.join(", ")}</span><span>Recommended {hand.recommendations.map((item) => item.ruleComparison ?? item.action).join(" → ") || "—"}</span><span>Chosen {hand.actions.join(" → ") || "—"}</span>{entry.mode !== "simulation" ? <span>{hand.startingStake ? `£${hand.startingStake}` : "—"} staked · {committedStake(hand) ? `£${committedStake(hand)}` : "—"} committed · {hand.actualReturn ? `£${hand.actualReturn}` : "—"} returned{handNet(hand) === null ? "" : ` · £${handNet(hand)} net`}</span> : null}</div>)}</div></details></td><td data-label="Dealer">{entry.dealer}</td><td data-label="Outcome">{entry.hands.map(handSummary).join("; ")}</td></tr>)}</tbody></table></div>}
            <p className="field-hint">Recorded outcomes describe what happened; they do not grade whether the strategy recommendation was correct.</p>
          </div>
        </details>

        <details className="calculator-band calculator-band-secondary stack blackjack-how-to" data-pd-id="calculators.blackjack.how-to"><summary>How to use</summary><div className="stack"><ol><li>Choose Simulation, Free Play or Live Play.</li><li>Enable Surrender only if the game rules allow it.</li><li>Enable Dealer hits Soft 17 only if the game rules say H17; otherwise leave it off.</li><li>Enter the dealer&apos;s visible card.</li><li>Enter your first two cards using the fast rank picker.</li><li>Follow or check the recommended basic-strategy move.</li><li>After Hit, enter the next card for the updated recommendation.</li></ol><p className="field-hint">Recommendations minimise the house edge over the long run; they do not guarantee an individual hand. Never take Insurance under this strategy.</p></div></details>
      </div>
      {sessionSetupOpen && typeof document !== "undefined" ? createPortal(<div className="modal-backdrop modal-backdrop-elevated" data-pd-id="calculators.blackjack.session-setup.backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSessionSetupOpen(false); }}><section aria-label="Blackjack Session Setup" aria-modal="true" className="modal-panel workflow-editor-modal fund-manager-settings-modal settings-adaptive-modal blackjack-session-setup-modal" data-pd-id="calculators.blackjack.session-setup.dialog" onKeyDown={(event) => { if (event.key === "Escape") setSessionSetupOpen(false); }} ref={sessionSetupRef} role="dialog" tabIndex={-1}>
        <header className="workflow-editor-modal-header"><div><span className="eyebrow">Blackjack</span><h2>Session Setup</h2></div><button aria-label="Close Session Setup" className="modal-close-button" onClick={() => setSessionSetupOpen(false)} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button></header>
        <div className="workflow-editor-modal-body stack settings-adaptive-modal-body"><div className="form-grid settings-dialog-form-grid">
          <label className="field-control"><span>Activity source</span><select aria-label="Blackjack activity source" data-initial-focus data-pd-id="calculators.blackjack.activity-source" onChange={(event) => updateDetail("activitySource", event.target.value)} value={details.activitySource}><option value="">Select source</option><option value="free_credit">Free chips / credit</option><option value="promotion">Promotion / offer</option><option value="own_cash">Own cash / manual play</option></select></label>
          <label className="field-control"><span>Blackjack payout</span><select aria-label="Blackjack payout" data-pd-id="calculators.blackjack.payout" onChange={(event) => updateDetail("blackjackPayout", event.target.value)} value={details.blackjackPayout}><option value="">Select payout</option><option value="three_to_two">3:2</option><option value="six_to_five">6:5</option></select></label>
          {livePlay ? <><FinancialInputField dataPdId="calculators.blackjack.starting-balance" error={moneyInputError(details.startingBalance, "Starting balance")} help="Enter the reviewed balance before play." id="blackjack-starting-balance" label="Session starting balance" onChange={(value) => updateDetail("startingBalance", value)} value={details.startingBalance} /><FinancialInputField dataPdId="calculators.blackjack.ending-balance" error={moneyInputError(details.endingBalance, "Ending balance")} help="Enter the reviewed balance after play." id="blackjack-ending-balance" label="Session ending balance" onChange={(value) => updateDetail("endingBalance", value)} value={details.endingBalance} /><FinancialInputField dataPdId="calculators.blackjack.play-limit" error={moneyInputError(details.playLimitValue, "Session play limit")} help="Optional reference limit; it never places or blocks a wager." id="blackjack-play-limit" label="Session play limit (optional)" onChange={(value) => updateDetail("playLimitValue", value)} value={details.playLimitValue} /><div className="field-control blackjack-play-limit-mode"><span>Play limit mode</span><CalculatorSegmentedControl ariaLabel="Blackjack play limit mode" dataPdId="calculators.blackjack.play-limit-mode" onChange={(value) => updateDetail("playLimitMode", value)} options={[{ label: "Fixed stake cap", value: "fixed_stake_cap" }, { label: "Use winnings", value: "use_winnings" }]} value={details.playLimitMode} /></div></> : null}
          {freePlay ? <><FinancialInputField dataPdId="calculators.blackjack.free-credit" error={moneyInputError(details.freeCreditValue, "Free credit value")} help="Free credit is not user cash stake." id="blackjack-free-credit" label="Free credit / chip value (optional)" onChange={(value) => updateDetail("freeCreditValue", value)} value={details.freeCreditValue} /><FinancialInputField dataPdId="calculators.blackjack.withdrawable-result" error={moneyInputError(details.withdrawableResult, "Withdrawable result")} help="Enter only real cash or withdrawable value produced." id="blackjack-withdrawable-result" label="Cash / withdrawable result (optional)" onChange={(value) => updateDetail("withdrawableResult", value)} value={details.withdrawableResult} /></> : null}
          <div className="field-control field-span-2"><span>Table type</span><CalculatorSegmentedControl ariaLabel="Blackjack table type" dataPdId="calculators.blackjack.table-type" onChange={(value) => updateDetail("tableType", value)} options={[{ label: "Digital / RNG", value: "digital_rng" }, { label: "Live Dealer", value: "live_dealer" }]} value={details.tableType || "digital_rng"} /></div>
        </div>{livePlay && balanceResult !== null ? <FinancialValueReplayGroup><div className="blackjack-session-summary-row blackjack-session-reconciliation"><div className="blackjack-session-result"><span>Balance result</span>{balanceResult === "0.00" ? <output aria-label="Balance result: £ 0.00" className="financial-value financial-value-neutral">£ 0.00</output> : <FinancialValue label="Balance result" showPositiveSign value={balanceResult} />}</div><div className="blackjack-session-result"><span>Recorded-hand result</span>{handActivityResult === null ? <strong>Incomplete</strong> : <FinancialValue label="Recorded hand result" showPositiveSign value={handActivityResult} />}</div><div className="blackjack-session-result"><span>Difference</span>{reconciliationDifference === null ? <strong>Incomplete</strong> : <FinancialValue label="Balance and recorded hand difference" showPositiveSign value={reconciliationDifference} />}</div></div></FinancialValueReplayGroup> : null}</div>
        <footer className="workflow-editor-modal-footer"><button className="modal-primary-button" onClick={() => setSessionSetupOpen(false)} type="button">Done</button></footer>
      </section></div>, document.body) : null}
      <ConfirmationDialog cancelLabel="Keep history" confirmLabel="Clear History" description="Clear this authenticated browser session's Blackjack hand history and restart the session counter?" onCancel={() => setConfirmClear(false)} onConfirm={() => { try { sessionStorage.removeItem(storageKey); } catch { /* Session storage is optional. */ } setHistory([]); setRound(emptyRound(1)); setDetails({ ...emptySessionDetails(), startedAt: new Date().toISOString() }); setPreview(null); setSessionModeError(""); setUndoStack([]); setHistoryOpen(true); setLastHandOpen(true); setLastHandInteracted(false); setCardTarget({ kind: "dealer" }); setConfirmClear(false); }} open={confirmClear} title="Clear Blackjack history?" />
      {conversionSnapshot ? <CalculatorConversionDialog blackjack={conversionSnapshot} onClose={() => setConversionSnapshot(null)} /> : null}
    </div>
  );
}
