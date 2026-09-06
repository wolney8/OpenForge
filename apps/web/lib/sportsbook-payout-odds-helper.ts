import { hasCompleteDecimalInputSyntax } from "./sportsbook-odds-input";

export const PAYOUT_AMOUNT_FORMAT_MESSAGE =
  "Enter a decimal amount using a full stop, for example 10.50.";

function normalizedParts(value: string): [string, string] {
  const [whole = "0", fraction = ""] = value.split(".");
  return [whole.replace(/^0+(?=\d)/, "") || "0", fraction];
}

function compareDecimalStrings(left: string, right: string): number {
  const [leftWhole, leftFraction] = normalizedParts(left);
  const [rightWhole, rightFraction] = normalizedParts(right);
  if (leftWhole.length !== rightWhole.length) {
    return leftWhole.length > rightWhole.length ? 1 : -1;
  }
  if (leftWhole !== rightWhole) {
    return leftWhole > rightWhole ? 1 : -1;
  }
  const precision = Math.max(leftFraction.length, rightFraction.length);
  const comparableLeft = leftFraction.padEnd(precision, "0");
  const comparableRight = rightFraction.padEnd(precision, "0");
  if (comparableLeft === comparableRight) {
    return 0;
  }
  return comparableLeft > comparableRight ? 1 : -1;
}

export function getPayoutStakeInputError(value: string): string | null {
  if (value === "") {
    return "Enter a cash back stake.";
  }
  if (!hasCompleteDecimalInputSyntax(value)) {
    return PAYOUT_AMOUNT_FORMAT_MESSAGE;
  }
  if (compareDecimalStrings(value, "0") <= 0) {
    return "Enter a cash back stake greater than zero.";
  }
  return null;
}

export function getPayoutReturnInputError(
  value: string,
  cashBackStake: string
): string | null {
  if (value === "") {
    return "Enter a total potential return.";
  }
  if (!hasCompleteDecimalInputSyntax(value)) {
    return PAYOUT_AMOUNT_FORMAT_MESSAGE;
  }
  if (compareDecimalStrings(value, "0") <= 0) {
    return "Enter a total potential return greater than zero.";
  }
  if (
    getPayoutStakeInputError(cashBackStake) === null &&
    compareDecimalStrings(value, cashBackStake) < 0
  ) {
    return "Total potential return must include and be at least the cash back stake.";
  }
  return null;
}
