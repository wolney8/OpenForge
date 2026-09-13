import { getMoneyInputErrors } from "./decimal-input";
import {
  getSportsbookOddsInputError,
  hasCompleteDecimalInputSyntax,
} from "./sportsbook-odds-input";

const moneyFields = [
  "free_bet_value", "lay_actual", "lay_matched_stake_1",
  "manual_override_value", "source_award_expected_value",
];
export function getFreeBetInputErrors(input: Record<string, unknown>): Record<string, string> {
  const errors = getMoneyInputErrors(input, moneyFields);
  for (const field of ["back_odds", "lay_odds_1"]) {
    if (input[field] === undefined) continue;
    const error = typeof input[field] === "string"
      ? getSportsbookOddsInputError(input[field]) : "Enter decimal odds.";
    if (error) errors[field] = error;
  }
  const commission = input.lay_commission_1;
  if (commission !== undefined && commission !== ""
    && (typeof commission !== "string" || !hasCompleteDecimalInputSyntax(commission)
      || !Number.isFinite(Number(commission)) || Number(commission) < 0 || Number(commission) > 1)) {
    errors.lay_commission_1 = "Enter commission as a finite decimal ratio from 0 to 1.";
  }
  return errors;
}
