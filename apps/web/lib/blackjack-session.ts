import { normalizeMoneyInput } from "./decimal-input";

export type BlackjackSessionMode = "simulation" | "free_play" | "live_play";
export type BlackjackTableType = "" | "digital_rng" | "live_dealer";
export type BlackjackActivitySource = "" | "free_credit" | "promotion" | "own_cash";
export type BlackjackPlayLimitMode = "fixed_stake_cap" | "use_winnings";
export type BlackjackPayoutRule = "one_to_one" | "three_to_two" | "six_to_five" | "two_to_one" | "custom";
export type BlackjackReturnSource = "calculated" | "entered" | null;

export type BlackjackSessionHandSnapshot = {
  actual_actions: string[];
  actual_return: string | null;
  actual_return_source?: BlackjackReturnSource;
  cards: string[];
  classification: string | null;
  committed_stake: string | null;
  label: string;
  outcome: string;
  net_result?: string | null;
  recommendation_sequence: string[];
  starting_stake: string | null;
  total: number | null;
};

export type BlackjackSessionHistorySnapshot = {
  dealer_card: string;
  hand_number: number;
  hands: BlackjackSessionHandSnapshot[];
};

export type BlackjackSessionSourceSnapshot = {
  activity_source: Exclude<BlackjackActivitySource, ""> | null;
  calculator_family: "blackjack_strategy";
  calculator_version: "blackjack-session-v1";
  conversion_eligible: boolean;
  ended_at: string;
  hands: BlackjackSessionHistorySnapshot[];
  monetary: {
    ending_balance: string | null;
    free_credit_value: string | null;
    recorded_hand_net: string | null;
    session_result: string | null;
    starting_balance: string | null;
    withdrawable_result: string | null;
    gross_staked: string;
    gross_returned: string | null;
  };
  hand_financials: {
    gross_returned: string | null;
    gross_staked: string;
    net: string | null;
    unit: "cash" | "credit" | null;
  };
  play_limit: {
    mode: BlackjackPlayLimitMode;
    remaining_loss_buffer: string | null;
    returns_complete: boolean;
    value: string | null;
  };
  rules: {
    blackjack_payout: BlackjackPayoutRule | null;
    blackjack_payout_profit_multiplier: string | null;
    dealer_hits_soft_17: boolean;
    surrender_allowed: boolean;
  };
  session_mode: BlackjackSessionMode;
  source_checksum: string;
  source_id: string;
  started_at: string;
  table_type: Exclude<BlackjackTableType, ""> | null;
  total_hands: number;
};

export function moneyInputError(value: string, label: string): string | null {
  if (!value) return null;
  return normalizeMoneyInput(value) !== null ? null : `${label} must be a non-negative amount with at most two decimal places.`;
}

export function moneyToCents(value: string): bigint | null {
  const normalized = normalizeMoneyInput(value);
  if (!normalized) return null;
  const [whole, fraction] = normalized.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction);
}

export function centsToMoney(value: bigint): string {
  const sign = value < BigInt(0) ? "-" : "";
  const absolute = value < BigInt(0) ? -value : value;
  return `${sign}${absolute / BigInt(100)}.${(absolute % BigInt(100)).toString().padStart(2, "0")}`;
}

export function subtractMoney(minuend: string, subtrahend: string): string | null {
  const left = moneyToCents(minuend);
  const right = moneyToCents(subtrahend);
  return left === null || right === null ? null : centsToMoney(left - right);
}

export function subtractSignedMoney(minuend: string, subtrahend: string): string | null {
  const parse = (value: string) => {
    const negative = value.startsWith("-");
    const cents = moneyToCents(negative ? value.slice(1) : value);
    return cents === null ? null : negative ? -cents : cents;
  };
  const left = parse(minuend);
  const right = parse(subtrahend);
  return left === null || right === null ? null : centsToMoney(left - right);
}

export function multiplyMoney(value: string, multiplier: number): string | null {
  const cents = moneyToCents(value);
  return cents === null ? null : centsToMoney(cents * BigInt(multiplier));
}

export function blackjackCommittedStake(startingStake: string, actualActions: string[]): string | null {
  return multiplyMoney(startingStake, actualActions.includes("Double") ? 2 : 1);
}

function multiplyMoneyRatio(value: string, numerator: bigint, denominator: bigint): string | null {
  const cents = moneyToCents(value);
  if (cents === null) return null;
  return centsToMoney((cents * numerator * BigInt(2) + denominator) / (denominator * BigInt(2)));
}

export function normalizeBlackjackPayoutMultiplier(value: string): string | null {
  if (!/^\d+(?:\.\d{1,4})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  if (BigInt(`${whole}${fraction}`) <= BigInt(0)) return null;
  return fraction ? `${BigInt(whole)}.${fraction}` : BigInt(whole).toString();
}

function payoutMultiplierRatio(value: string): [bigint, bigint] | null {
  const normalized = normalizeBlackjackPayoutMultiplier(value);
  if (normalized === null) return null;
  const [whole, fraction = ""] = normalized.split(".");
  return [BigInt(`${whole}${fraction}`), BigInt(10) ** BigInt(fraction.length)];
}

export function blackjackDefaultGrossReturn(
  committedStake: string,
  outcome: string,
  payout: BlackjackPayoutRule,
  customProfitMultiplier = "",
): string | null {
  if (outcome === "Win") return multiplyMoneyRatio(committedStake, BigInt(2), BigInt(1));
  if (outcome === "Push") return multiplyMoneyRatio(committedStake, BigInt(1), BigInt(1));
  if (outcome === "Loss" || outcome === "Bust") return multiplyMoneyRatio(committedStake, BigInt(0), BigInt(1));
  if (outcome === "Surrender") return multiplyMoneyRatio(committedStake, BigInt(1), BigInt(2));
  if (outcome === "Blackjack Win") {
    if (payout === "one_to_one") return multiplyMoneyRatio(committedStake, BigInt(2), BigInt(1));
    if (payout === "three_to_two") return multiplyMoneyRatio(committedStake, BigInt(5), BigInt(2));
    if (payout === "six_to_five") return multiplyMoneyRatio(committedStake, BigInt(11), BigInt(5));
    if (payout === "two_to_one") return multiplyMoneyRatio(committedStake, BigInt(3), BigInt(1));
    const customRatio = payout === "custom" ? payoutMultiplierRatio(customProfitMultiplier) : null;
    if (customRatio) return multiplyMoneyRatio(committedStake, customRatio[0] + customRatio[1], customRatio[1]);
  }
  return null;
}

export function blackjackRunningFinancials(hands: BlackjackSessionHandSnapshot[]): {
  grossReturned: string | null;
  grossStaked: string;
  net: string | null;
  returnsComplete: boolean;
} {
  const stakes = hands.map((hand) => hand.committed_stake ? moneyToCents(hand.committed_stake) : null);
  const returns = hands.map((hand) => hand.actual_return ? moneyToCents(hand.actual_return) : null);
  const grossStaked = stakes.reduce<bigint>((sum, value) => sum + (value ?? BigInt(0)), BigInt(0));
  const returnsComplete = hands.length === 0 || returns.every((value) => value !== null);
  const grossReturned = returnsComplete
    ? returns.reduce<bigint>((sum, value) => sum + (value ?? BigInt(0)), BigInt(0))
    : null;
  return {
    grossReturned: grossReturned === null ? null : centsToMoney(grossReturned),
    grossStaked: centsToMoney(grossStaked),
    net: grossReturned === null ? null : centsToMoney(grossReturned - grossStaked),
    returnsComplete,
  };
}

export function blackjackPlayLimitStatus(input: {
  grossStaked: string;
  limit: string;
  mode: BlackjackPlayLimitMode;
  net: string | null;
  nextStake: string;
  returnsComplete: boolean;
}): { prerequisiteMissing: boolean; remainingLossBuffer: string | null; warning: boolean } {
  const limit = moneyToCents(input.limit);
  const nextStake = moneyToCents(input.nextStake);
  if (limit === null || nextStake === null) return { prerequisiteMissing: false, remainingLossBuffer: null, warning: false };
  if (input.mode === "fixed_stake_cap") {
    const grossStaked = moneyToCents(input.grossStaked) ?? BigInt(0);
    return { prerequisiteMissing: false, remainingLossBuffer: null, warning: grossStaked + nextStake > limit };
  }
  if (!input.returnsComplete || input.net === null) return { prerequisiteMissing: true, remainingLossBuffer: null, warning: false };
  const net = input.net.startsWith("-") ? -moneyToCents(input.net.slice(1))! : moneyToCents(input.net)!;
  const remaining = limit + net;
  return { prerequisiteMissing: false, remainingLossBuffer: centsToMoney(remaining), warning: nextStake > remaining };
}

export function blackjackConversionEligible(mode: BlackjackSessionMode): boolean {
  return mode === "free_play" || mode === "live_play";
}

function canonicalise(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalise);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalise(item)])
    );
  }
  return value;
}

export function canonicalBlackjackSessionJson(value: unknown): string {
  return JSON.stringify(canonicalise(value));
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function buildBlackjackSessionSourceSnapshot(input: {
  activitySource?: BlackjackActivitySource;
  blackjackPayout?: BlackjackPayoutRule;
  blackjackPayoutCustom?: string;
  endedAt: string;
  endingBalance: string;
  freeCreditValue: string;
  hands: BlackjackSessionHistorySnapshot[];
  mode: BlackjackSessionMode;
  recordedHandNet: string | null;
  playLimitMode?: BlackjackPlayLimitMode;
  playLimitValue?: string;
  soft17Rule: "stands" | "hits";
  startedAt: string;
  startingBalance: string;
  surrenderAllowed: boolean;
  tableType: BlackjackTableType;
  withdrawableResult: string;
}): Promise<BlackjackSessionSourceSnapshot> {
  const canonicalMoney = (value: string) => {
    const cents = moneyToCents(value);
    return cents === null ? null : centsToMoney(cents);
  };
  const sessionResult = input.mode === "live_play"
    ? subtractMoney(input.endingBalance, input.startingBalance)
    : null;
  const immutableHands = JSON.parse(canonicalBlackjackSessionJson(input.hands)) as BlackjackSessionHistorySnapshot[];
  const running = blackjackRunningFinancials(immutableHands.flatMap((round) => round.hands));
  const playLimitValue = canonicalMoney(input.playLimitValue ?? "");
  const remainingLossBuffer = input.playLimitMode === "use_winnings" && playLimitValue !== null && running.net !== null
    ? centsToMoney(moneyToCents(playLimitValue)! + (running.net.startsWith("-") ? -moneyToCents(running.net.slice(1))! : moneyToCents(running.net)!))
    : null;
  const withoutIdentity = {
    activity_source: input.mode === "simulation" || !input.activitySource ? null : input.activitySource,
    calculator_family: "blackjack_strategy" as const,
    calculator_version: "blackjack-session-v1" as const,
    conversion_eligible: blackjackConversionEligible(input.mode),
    ended_at: input.endedAt,
    hands: immutableHands,
    hand_financials: {
      gross_returned: input.mode === "simulation" ? null : running.grossReturned,
      gross_staked: input.mode === "simulation" ? "0.00" : running.grossStaked,
      net: input.mode === "simulation" ? null : running.net,
      unit: input.mode === "live_play" ? "cash" as const : input.mode === "free_play" ? "credit" as const : null,
    },
    monetary: {
      ending_balance: input.mode === "live_play" ? canonicalMoney(input.endingBalance) : null,
      free_credit_value: input.mode === "free_play" ? canonicalMoney(input.freeCreditValue) : null,
      recorded_hand_net: input.mode === "live_play" ? input.recordedHandNet : null,
      session_result: sessionResult,
      starting_balance: input.mode === "live_play" ? canonicalMoney(input.startingBalance) : null,
      withdrawable_result: input.mode === "free_play" ? canonicalMoney(input.withdrawableResult) : null,
      gross_staked: input.mode === "live_play" ? running.grossStaked : "0.00",
      gross_returned: input.mode === "live_play" ? running.grossReturned : null,
    },
    play_limit: {
      mode: input.playLimitMode ?? "fixed_stake_cap",
      remaining_loss_buffer: input.mode === "live_play" ? remainingLossBuffer : null,
      returns_complete: input.mode === "live_play" ? running.returnsComplete : true,
      value: input.mode === "live_play" ? playLimitValue : null,
    },
    rules: {
      blackjack_payout: input.blackjackPayout || null,
      blackjack_payout_profit_multiplier: input.blackjackPayout === "custom"
        ? normalizeBlackjackPayoutMultiplier(input.blackjackPayoutCustom ?? "")
        : null,
      dealer_hits_soft_17: input.soft17Rule === "hits",
      surrender_allowed: input.surrenderAllowed,
    },
    session_mode: input.mode,
    started_at: input.startedAt,
    table_type: input.mode === "simulation" || !input.tableType ? null : input.tableType,
    total_hands: input.hands.length,
  };
  const sourceChecksum = await sha256(canonicalBlackjackSessionJson(withoutIdentity));
  return {
    ...withoutIdentity,
    source_checksum: sourceChecksum,
    source_id: `blackjack-session-${sourceChecksum.slice(0, 20)}`,
  };
}
