export const SPORTSBOOK_ODDS_FORMAT_MESSAGE =
  "Enter decimal odds using a full stop, for example 8.5.";
export const SPORTSBOOK_ODDS_MINIMUM_MESSAGE = "Enter odds of 1.01 or higher.";

const completeDecimalInputPattern = /^[0-9]+(?:\.[0-9]+)?$/;

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
