export type CasinoCalculationState =
  | "calculable"
  | "partial"
  | "invalid"
  | "unknown_rtp"
  | "unknown_reward_value"
  | "incomplete_wagering_details";

export type CasinoWagerBase =
  | "bonus"
  | "deposit"
  | "deposit_plus_bonus"
  | "cash_stake"
  | "fixed_amount"
  | "custom"
  | "converted_reward";

export type CasinoCalculationMoneyResult = {
  state: CasinoCalculationState;
  value: number | null;
  formulaLabel: string;
  reason?: string;
};

export type CasinoSpinCalculationResult = {
  state: CasinoCalculationState;
  exactSpins: number | null;
  actionableSpins: number | null;
  formulaLabel: string;
  reason?: string;
};

export type CasinoRtpExpectationResult = {
  state: CasinoCalculationState;
  expectedReturn: number | null;
  expectedLoss: number | null;
  rtpDecimal: number | null;
  formulaLabel: string;
  reason?: string;
};

export type CasinoCampaignEvResult = {
  state: CasinoCalculationState;
  expectedValue: number | null;
  formulaLabel: string;
  reason?: string;
};

export type CasinoSettlementNetResult = {
  state: "empty" | "calculable" | "invalid";
  value: number | null;
  formulaLabel: string;
  reason?: string;
};

const moneyPrecision = 100;

export function parseCasinoNumericInput(value: number | string | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? normalizeNegativeZero(value) : null;
  }

  const rawValue = value?.trim();
  const isAccountingNegative = Boolean(rawValue?.includes("(") && rawValue.includes(")"));
  const normalized = rawValue
    ?.replace(/[£,\s]/g, "")
    .replace(/[()]/g, "")
    .replace(/^x/i, "")
    .trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return normalizeNegativeZero(isAccountingNegative ? -Math.abs(parsed) : parsed);
}

export function roundCasinoMoney(value: number): number {
  return normalizeNegativeZero(Math.round((value + Number.EPSILON) * moneyPrecision) / moneyPrecision);
}

export function calculateWagerTarget(input: {
  base: CasinoWagerBase;
  bonusAmount?: number | string | null;
  depositAmount?: number | string | null;
  cashStake?: number | string | null;
  fixedAmount?: number | string | null;
  customAmount?: number | string | null;
  convertedRewardAmount?: number | string | null;
  multiplier?: number | string | null;
}): CasinoCalculationMoneyResult {
  if (input.base === "fixed_amount") {
    const fixedAmount = parseCasinoNumericInput(input.fixedAmount);
    if (fixedAmount === null || fixedAmount < 0) {
      return incompleteMoney("Fixed wager target", "Enter a valid fixed wager target.");
    }
    return {
      state: "calculable",
      value: roundCasinoMoney(fixedAmount),
      formulaLabel: "Fixed target",
    };
  }

  const baseAmount = getWagerBaseAmount(input);
  const multiplier = parseCasinoNumericInput(input.multiplier);

  if (baseAmount === null || baseAmount < 0) {
    return incompleteMoney(getWagerBaseLabel(input.base), "Enter a valid wagering base.");
  }
  if (multiplier === null || multiplier <= 0) {
    return incompleteMoney("Wager multiplier", "Enter a multiplier greater than zero.");
  }

  return {
    state: "calculable",
    value: roundCasinoMoney(baseAmount * multiplier),
    formulaLabel: `${getWagerBaseLabel(input.base)} x ${formatMultiplier(multiplier)}`,
  };
}

export function calculateRewardWagerTarget(input: {
  rewardAmount?: number | string | null;
  multiplier?: number | string | null;
}): CasinoCalculationMoneyResult {
  return calculateWagerTarget({
    base: "converted_reward",
    convertedRewardAmount: input.rewardAmount,
    multiplier: input.multiplier,
  });
}

export function calculateSpinsRequired(input: {
  wagerTarget?: number | string | null;
  spinStake?: number | string | null;
}): CasinoSpinCalculationResult {
  const target = parseCasinoNumericInput(input.wagerTarget);
  const stake = parseCasinoNumericInput(input.spinStake);
  if (target === null || target < 0) {
    return incompleteSpins("Target / stake", "Enter a valid wager target.");
  }
  if (stake === null || stake <= 0) {
    return incompleteSpins("Target / stake", "Enter a spin stake greater than zero.");
  }

  const exactSpins = target / stake;
  return {
    state: "calculable",
    exactSpins,
    actionableSpins: Math.ceil(exactSpins),
    formulaLabel: `${formatMoney(target)} / ${formatMoney(stake)}`,
  };
}

export function calculateWageringProgress(input: {
  wagerTarget?: number | string | null;
  completedWager?: number | string | null;
  spinStake?: number | string | null;
}): {
  state: CasinoCalculationState;
  remainingWager: number | null;
  remainingSpins: number | null;
  formulaLabel: string;
  reason?: string;
} {
  const target = parseCasinoNumericInput(input.wagerTarget);
  const completed = parseCasinoNumericInput(input.completedWager) ?? 0;
  if (target === null || target < 0 || completed < 0) {
    return {
      state: "incomplete_wagering_details",
      remainingWager: null,
      remainingSpins: null,
      formulaLabel: "Target - completed",
      reason: "Enter a valid target and completed amount.",
    };
  }

  const remainingWager = roundCasinoMoney(Math.max(0, target - completed));
  const spinResult = calculateSpinsRequired({
    wagerTarget: remainingWager,
    spinStake: input.spinStake,
  });
  return {
    state: spinResult.state === "calculable" ? "calculable" : "partial",
    remainingWager,
    remainingSpins: spinResult.actionableSpins,
    formulaLabel: `${formatMoney(target)} - ${formatMoney(completed)}`,
    reason: spinResult.state === "calculable" ? undefined : spinResult.reason,
  };
}

export function calculateRtpExpectation(input: {
  wagerTarget?: number | string | null;
  rtpPercent?: number | string | null;
}): CasinoRtpExpectationResult {
  const target = parseCasinoNumericInput(input.wagerTarget);
  const rtpPercent = parseCasinoNumericInput(input.rtpPercent);

  if (target === null || target < 0) {
    return {
      state: "incomplete_wagering_details",
      expectedReturn: null,
      expectedLoss: null,
      rtpDecimal: null,
      formulaLabel: "Target x RTP",
      reason: "Enter a valid wager target.",
    };
  }
  if (rtpPercent === null) {
    return {
      state: "unknown_rtp",
      expectedReturn: null,
      expectedLoss: null,
      rtpDecimal: null,
      formulaLabel: "Target x RTP",
      reason: "RTP is unknown.",
    };
  }
  if (rtpPercent <= 0 || rtpPercent > 100) {
    return {
      state: "invalid",
      expectedReturn: null,
      expectedLoss: null,
      rtpDecimal: null,
      formulaLabel: "Target x RTP",
      reason: "RTP must be greater than 0 and no more than 100.",
    };
  }

  const rtpDecimal = rtpPercent / 100;
  return {
    state: "calculable",
    expectedReturn: roundCasinoMoney(target * rtpDecimal),
    expectedLoss: roundCasinoMoney(target * (1 - rtpDecimal)),
    rtpDecimal,
    formulaLabel: `${formatMoney(target)} at ${rtpPercent.toFixed(2)}% RTP`,
  };
}

export function calculateExpectedReturn(input: {
  wagerTarget?: number | string | null;
  rtpPercent?: number | string | null;
}): CasinoCalculationMoneyResult {
  const expectation = calculateRtpExpectation(input);
  return {
    state: expectation.state,
    value: expectation.expectedReturn,
    formulaLabel: expectation.formulaLabel,
    reason: expectation.reason,
  };
}

export function calculateExpectedLoss(input: {
  wagerTarget?: number | string | null;
  rtpPercent?: number | string | null;
}): CasinoCalculationMoneyResult {
  const expectation = calculateRtpExpectation(input);
  return {
    state: expectation.state,
    value: expectation.expectedLoss,
    formulaLabel: expectation.formulaLabel,
    reason: expectation.reason,
  };
}

export function calculateCasinoCampaignEV(input: {
  expectedRewardCashValue?: number | string | null;
  qualifyingExpectedLoss?: number | string | null;
  rewardExpectedLoss?: number | string | null;
  otherExpectedCosts?: number | string | null;
}): CasinoCampaignEvResult {
  const reward = parseCasinoNumericInput(input.expectedRewardCashValue);
  const qualifyingLoss = parseCasinoNumericInput(input.qualifyingExpectedLoss) ?? 0;
  const rewardLoss = parseCasinoNumericInput(input.rewardExpectedLoss) ?? 0;
  const costs = parseCasinoNumericInput(input.otherExpectedCosts) ?? 0;

  if (reward === null) {
    return {
      state: "unknown_reward_value",
      expectedValue: null,
      formulaLabel: "Reward - expected losses - costs",
      reason: "Expected reward value is unknown.",
    };
  }
  if (qualifyingLoss < 0 || rewardLoss < 0 || costs < 0) {
    return {
      state: "invalid",
      expectedValue: null,
      formulaLabel: "Reward - expected losses - costs",
      reason: "Expected losses and costs cannot be negative.",
    };
  }

  return {
    state: "calculable",
    expectedValue: roundCasinoMoney(reward - qualifyingLoss - rewardLoss - costs),
    formulaLabel: "Reward - expected losses - costs",
  };
}

export function calculateCasinoSettlementNetResult(input: {
  ownCashCommitted?: number | string | null;
  cashReturned?: number | string | null;
  rewardConverted?: number | string | null;
  otherCosts?: number | string | null;
}): CasinoSettlementNetResult {
  const rawValues = [
    input.ownCashCommitted,
    input.cashReturned,
    input.rewardConverted,
    input.otherCosts,
  ];
  const hasAnyValue = rawValues.some((value) => String(value ?? "").trim() !== "");
  if (!hasAnyValue) {
    return {
      state: "empty",
      value: null,
      formulaLabel: "Returned + reward - committed - costs",
      reason: "Enter settlement cash movement values to calculate a suggestion.",
    };
  }

  const ownCashCommitted = parseCasinoNumericInput(input.ownCashCommitted) ?? 0;
  const cashReturned = parseCasinoNumericInput(input.cashReturned) ?? 0;
  const rewardConverted = parseCasinoNumericInput(input.rewardConverted) ?? 0;
  const otherCosts = parseCasinoNumericInput(input.otherCosts) ?? 0;
  const hasInvalidValue = rawValues.some(
    (value) => String(value ?? "").trim() !== "" && parseCasinoNumericInput(value) === null
  );
  if (hasInvalidValue) {
    return {
      state: "invalid",
      value: null,
      formulaLabel: "Returned + reward - committed - costs",
      reason: "Enter valid cash amounts.",
    };
  }

  return {
    state: "calculable",
    value: roundCasinoMoney(cashReturned + rewardConverted - ownCashCommitted - otherCosts),
    formulaLabel: "Returned + reward - committed - costs",
  };
}

function getWagerBaseAmount(input: {
  base: CasinoWagerBase;
  bonusAmount?: number | string | null;
  depositAmount?: number | string | null;
  cashStake?: number | string | null;
  customAmount?: number | string | null;
  convertedRewardAmount?: number | string | null;
}): number | null {
  const bonus = parseCasinoNumericInput(input.bonusAmount);
  const deposit = parseCasinoNumericInput(input.depositAmount);
  switch (input.base) {
    case "bonus":
      return bonus;
    case "deposit":
      return deposit;
    case "deposit_plus_bonus":
      return bonus === null || deposit === null ? null : bonus + deposit;
    case "cash_stake":
      return parseCasinoNumericInput(input.cashStake);
    case "custom":
      return parseCasinoNumericInput(input.customAmount);
    case "converted_reward":
      return parseCasinoNumericInput(input.convertedRewardAmount);
    default:
      return null;
  }
}

function getWagerBaseLabel(base: CasinoWagerBase): string {
  switch (base) {
    case "bonus":
      return "Bonus";
    case "deposit":
      return "Deposit";
    case "deposit_plus_bonus":
      return "Deposit + bonus";
    case "cash_stake":
      return "Cash stake";
    case "fixed_amount":
      return "Fixed target";
    case "custom":
      return "Custom base";
    case "converted_reward":
      return "Converted reward";
  }
}

function incompleteMoney(formulaLabel: string, reason: string): CasinoCalculationMoneyResult {
  return {
    state: "incomplete_wagering_details",
    value: null,
    formulaLabel,
    reason,
  };
}

function incompleteSpins(formulaLabel: string, reason: string): CasinoSpinCalculationResult {
  return {
    state: "incomplete_wagering_details",
    exactSpins: null,
    actionableSpins: null,
    formulaLabel,
    reason,
  };
}

function formatMoney(value: number): string {
  return `£${roundCasinoMoney(value).toFixed(2)}`;
}

function formatMultiplier(value: number): string {
  return `${normalizeNegativeZero(value)}x`;
}

function normalizeNegativeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}
