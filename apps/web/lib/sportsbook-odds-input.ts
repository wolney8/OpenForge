export const SPORTSBOOK_ODDS_FORMAT_MESSAGE =
  "Enter decimal odds using a full stop, for example 8.5.";
export const SPORTSBOOK_ODDS_MINIMUM_MESSAGE = "Enter odds of 1.01 or higher.";

const completeDecimalInputPattern = /^[0-9]+(?:\.[0-9]+)?$/;
const simpleDecimalCommaPattern = /^[0-9]+,[0-9]{1,2}$/;
const fractionalOddsPattern = /^([0-9]+)\/([0-9]+)$/;

export function hasCompleteDecimalInputSyntax(value: string): boolean {
  return completeDecimalInputPattern.test(value);
}

export function getSportsbookOddsInputError(
  value: string,
  options: { required?: boolean } = {}
): string | null {
  if (value === "") {
    return options.required ? "Enter odds." : null;
  }
  if (!hasCompleteDecimalInputSyntax(value)) {
    return SPORTSBOOK_ODDS_FORMAT_MESSAGE;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return SPORTSBOOK_ODDS_FORMAT_MESSAGE;
  }
  if (parsed < 1.01) {
    return SPORTSBOOK_ODDS_MINIMUM_MESSAGE;
  }
  return null;
}

export function parseSportsbookOddsInput(value: string): number | null {
  if (getSportsbookOddsInputError(value) !== null || value === "") {
    return null;
  }
  return Number(value);
}

export type CalculatorOddsNormalization = {
  canonicalValue: string;
  converted: boolean;
  error: string | null;
};

export function normalizeCalculatorOddsInput(value: string): CalculatorOddsNormalization {
  let canonicalValue = value;
  if (simpleDecimalCommaPattern.test(value)) {
    canonicalValue = value.replace(",", ".");
  } else {
    const fraction = fractionalOddsPattern.exec(value);
    if (fraction) {
      const numerator = BigInt(fraction[1]);
      const denominator = BigInt(fraction[2]);
      if (denominator === BigInt(0)) {
        return { canonicalValue: value, converted: false, error: "Fractional odds need a denominator above zero." };
      }
      const hundred = BigInt(100);
      const scaledNumerator = (numerator + denominator) * hundred;
      const roundedHundredths = (scaledNumerator / denominator) +
        ((scaledNumerator % denominator) * BigInt(2) >= denominator ? BigInt(1) : BigInt(0));
      canonicalValue = `${roundedHundredths / hundred}.${String(roundedHundredths % hundred).padStart(2, "0")}`;
    }
  }
  const error = getSportsbookOddsInputError(canonicalValue, { required: true });
  return { canonicalValue, converted: canonicalValue !== value && error === null, error };
}
