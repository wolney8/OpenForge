/** Presentation entry points derived from persisted lifecycle evidence. No source mutation. */
export function sportsbookWorkbenchEntry(input: {
  status: string;
  layStatus: string;
  matchStrategy: string;
  setupComplete: boolean;
}): "setup" | "matching" | "placement" | "settlement" {
  if (!input.setupComplete) return "setup";
  if (["Settled", "Void", "Cancelled", "Free Bet Awarded"].includes(input.status)) return "settlement";
  if (input.status !== "Placed") return "matching";
  if (input.matchStrategy === "Partial Lay" && input.layStatus !== "Fully Laid") return "placement";
  if (input.matchStrategy !== "No Lay" && input.layStatus !== "Fully Laid") return "matching";
  return "settlement";
}

export function freeBetWorkbenchEntry(input: {
  status: string;
  result: string;
  layStatus: string;
  setupComplete: boolean;
}): "setup" | "matching" | "settlement" {
  if (!input.setupComplete || input.status === "Not Yet Awarded") return "setup";
  if (input.status === "Settled" || input.result !== "Pending") return "settlement";
  if (input.status === "Placed" && input.layStatus === "Fully Laid") return "settlement";
  return "matching";
}

export function casinoWorkbenchEntry(input: {
  status: string;
  result: string;
  setupComplete: boolean;
  hasCampaign: boolean;
  campaignComplete: boolean;
  hasReward: boolean;
  rewardComplete: boolean;
}): "setup" | "campaign" | "reward" | "settlement" {
  if (!input.setupComplete) return "setup";
  if (input.status === "Settled" || input.result !== "Pending") return "settlement";
  if (input.hasCampaign && !input.campaignComplete) return "campaign";
  if (input.hasReward && !input.rewardComplete) return "reward";
  return "settlement";
}

/** Extra Place has its own two-stage native workflow, not bet-matching stages. */
export function extraPlaceWorkbenchEntry(input: {
  status: string;
  calculationInputsComplete: boolean;
}): "calculate" | "settlement" {
  if (["Settled", "Void", "Cancelled"].includes(input.status)) return "settlement";
  if (input.status === "Placed" && input.calculationInputsComplete) return "settlement";
  return "calculate";
}
