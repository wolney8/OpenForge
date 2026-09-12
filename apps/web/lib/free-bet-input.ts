import { normalizeMoneyInput } from "./decimal-input";
import {
  getSportsbookOddsInputError,
  hasCompleteDecimalInputSyntax,
} from "./sportsbook-odds-input";

const moneyFields = [
  "free_bet_value", "lay_actual", "lay_matched_stake_1",
  "manual_override_value", "source_award_expected_value",
];
export function getFreeBetInputErrors(input: Record<string, unknown>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of moneyFields) {
    const raw = input[field];
    if (raw === undefined) continue;
    const canonical = typeof raw === "string"
      ? normalizeMoneyInput(raw.trim(), {allowNegative: field === "manual_override_value"})
      : null;
    if (canonical === null || canonical.length > 40 || String(raw).length > 40) {
      errors[field] = "Enter a complete finite amount with at most two decimal places.";
    }
  }
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
