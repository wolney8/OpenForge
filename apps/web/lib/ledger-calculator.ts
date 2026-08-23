export type LedgerCalculatorMode = "Simple" | "Advanced";

export type SingleLayResultMode = "Underlay" | "Standard" | "Overlay" | "Custom";

export type LayWorkflowMode = "No Lay" | "Standard" | "Advanced" | "Multilay";

export type MatchRatingTone = "low" | "mid" | "good" | "arp";

export type FreeBetResultCardPreviewInput = {
  retentionMode: string;
  freeBetValue: string;
  backOdds: string;
  layOdds: string;
  layCommission: string;
  layStake: string;
};

export type FreeBetResultCardPreview = {
  layStake: number;
  liability: number;
  backWin: number;
  layWin: number;
};

export const sportsbookLayWorkflowModeOptions: LayWorkflowMode[] = [
  "No Lay",
  "Standard",
  "Advanced",
  "Multilay",
];

export function isDecimalCalculatorInput(value: string): boolean {
  return value === "" || /^\d*(?:\.\d*)?$/.test(value);
}

function parseCalculatorNumber(value: string): number | null {
  const normalized = value.trim();
  if (!normalized || !isDecimalCalculatorInput(normalized)) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateFreeBetResultCardPreview(
  input: FreeBetResultCardPreviewInput
): FreeBetResultCardPreview | null {
  const freeBetValue = parseCalculatorNumber(input.freeBetValue);
  const backOdds = parseCalculatorNumber(input.backOdds);
  const layOdds = parseCalculatorNumber(input.layOdds);
  const layCommission = parseCalculatorNumber(input.layCommission || "0");
  const layStake = parseCalculatorNumber(input.layStake);

  if (
    freeBetValue === null ||
    backOdds === null ||
    layOdds === null ||
    layCommission === null ||
    layStake === null ||
    layOdds <= 1
  ) {
    return null;
  }

  const backWinBase =
    input.retentionMode === "SR" ? freeBetValue * backOdds : freeBetValue * (backOdds - 1);
  const liability = roundMoney(layStake * (layOdds - 1));

  return {
    layStake: roundMoney(layStake),
    liability,
    backWin: roundMoney(backWinBase - liability),
    layWin: roundMoney(layStake * (1 - layCommission)),
  };
}

export function getMatchRatingPillTone(value: number): MatchRatingTone {
  if (value >= 100) {
    return "arp";
  }
  if (value >= 70) {
    return "good";
  }
  if (value >= 40) {
    return "mid";
  }
  return "low";
}

export function getMatchRatingInterpretation(value: number): string {
  if (value >= 100) {
    return "ARP risk";
  }
  if (value >= 70) {
    return "Good";
  }
  if (value >= 40) {
    return "Review";
  }
  return "Poor";
}

export function coerceStrategyForCalculatorMode(
  mode: LedgerCalculatorMode,
  strategy: string
): string {
  return mode === "Simple" ? "Standard" : strategy;
}

export function getSingleLayResultModes(mode: LedgerCalculatorMode): SingleLayResultMode[] {
  return mode === "Simple"
    ? ["Standard"]
    : ["Underlay", "Standard", "Overlay", "Custom"];
}

export function getLayWorkflowModeForStrategy(strategy: string): LayWorkflowMode {
  if (strategy === "No Lay") {
    return "No Lay";
  }
  if (strategy === "Multilay" || strategy === "Multilay-Underlay") {
    return "Multilay";
  }
  if (strategy === "Partial Lay") {
    return "Standard";
  }
  if (strategy === "Underlay" || strategy === "Overlay" || strategy === "Custom") {
    return "Advanced";
  }
  return "Standard";
}

export function getCalculatorModeForLayWorkflowMode(mode: LayWorkflowMode): LedgerCalculatorMode {
  return mode === "Advanced" || mode === "Multilay" ? "Advanced" : "Simple";
}

export function getStrategyForLayWorkflowMode(
  mode: LayWorkflowMode,
  currentStrategy: string
): string {
  if (mode === "Advanced") {
    return currentStrategy === "Underlay" ||
      currentStrategy === "Overlay" ||
      currentStrategy === "Custom" ||
      currentStrategy === "Standard"
      ? currentStrategy
      : "Standard";
  }
  if (mode === "Multilay") {
    return currentStrategy === "Multilay-Underlay" ? "Multilay-Underlay" : "Multilay";
  }
  return mode;
}
