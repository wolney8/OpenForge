export type BlackjackSessionMode = "simulation" | "free_play" | "live_play";
export type BlackjackTableType = "" | "digital_rng" | "live_dealer";

export type BlackjackSessionHandSnapshot = {
  actual_actions: string[];
  actual_return: string | null;
  cards: string[];
  classification: string | null;
  committed_stake: string | null;
  label: string;
  outcome: string;
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
  };
  rules: { dealer_hits_soft_17: boolean; surrender_allowed: boolean };
  session_mode: BlackjackSessionMode;
  source_checksum: string;
  source_id: string;
  started_at: string;
  table_type: Exclude<BlackjackTableType, ""> | null;
  total_hands: number;
};

const moneyPattern = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

export function moneyInputError(value: string, label: string): string | null {
  if (!value) return null;
  return moneyPattern.test(value) ? null : `${label} must be a non-negative amount with at most two decimal places.`;
}

export function moneyToCents(value: string): bigint | null {
  if (!moneyPattern.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
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
  endedAt: string;
  endingBalance: string;
  freeCreditValue: string;
  hands: BlackjackSessionHistorySnapshot[];
  mode: BlackjackSessionMode;
  recordedHandNet: string | null;
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
  const withoutIdentity = {
    calculator_family: "blackjack_strategy" as const,
    calculator_version: "blackjack-session-v1" as const,
    conversion_eligible: blackjackConversionEligible(input.mode),
    ended_at: input.endedAt,
    hands: immutableHands,
    monetary: {
      ending_balance: input.mode === "live_play" ? canonicalMoney(input.endingBalance) : null,
      free_credit_value: input.mode === "free_play" ? canonicalMoney(input.freeCreditValue) : null,
      recorded_hand_net: input.mode === "live_play" ? input.recordedHandNet : null,
      session_result: sessionResult,
      starting_balance: input.mode === "live_play" ? canonicalMoney(input.startingBalance) : null,
      withdrawable_result: input.mode === "free_play" ? canonicalMoney(input.withdrawableResult) : null,
    },
    rules: {
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
