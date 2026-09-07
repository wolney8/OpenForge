import { hasCompleteDecimalInputSyntax, getSportsbookOddsInputError } from "./sportsbook-odds-input";

export const CALCULATOR_AMOUNT_FORMAT_MESSAGE =
  "Enter a decimal amount using a full stop, for example 10.50.";
export const CALCULATOR_COMMISSION_MESSAGE =
  "Enter commission as a decimal from 0 to 1, for example 0.02.";

export type StandardQualifyingInputs = {
  backStake: string;
  backOdds: string;
  layOdds: string;
  exchangeCommission: string;
};

export type StandardQualifyingErrors = Record<keyof StandardQualifyingInputs, string | null>;

export function getStandardQualifyingErrors(
  inputs: StandardQualifyingInputs
): StandardQualifyingErrors {
  const stakeError = inputs.backStake === ""
    ? "Enter a back stake."
    : !hasCompleteDecimalInputSyntax(inputs.backStake)
      ? CALCULATOR_AMOUNT_FORMAT_MESSAGE
      : Number(inputs.backStake) <= 0
        ? "Enter a back stake greater than zero."
        : null;
  const commissionError = inputs.exchangeCommission === ""
    ? "Enter exchange commission."
    : !hasCompleteDecimalInputSyntax(inputs.exchangeCommission)
      ? CALCULATOR_COMMISSION_MESSAGE
      : Number(inputs.exchangeCommission) < 0 || Number(inputs.exchangeCommission) > 1
        ? CALCULATOR_COMMISSION_MESSAGE
        : null;
  return {
    backStake: stakeError,
    backOdds: getSportsbookOddsInputError(inputs.backOdds, { required: true }),
    layOdds: getSportsbookOddsInputError(inputs.layOdds, { required: true }),
    exchangeCommission: commissionError,
  };
}

export function hasStandardQualifyingErrors(errors: StandardQualifyingErrors): boolean {
  return Object.values(errors).some(Boolean);
}
