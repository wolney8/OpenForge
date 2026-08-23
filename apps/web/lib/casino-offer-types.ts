export type CasinoEditorTabId = "setup" | "campaign" | "reward" | "settlement" | "advanced";

export type CasinoOfferFieldGroup =
  | "cashStake"
  | "creditAmount"
  | "bonusAmount"
  | "wagering"
  | "requiredSpins"
  | "spinStake"
  | "awardedSpins"
  | "rewardValue";

export type CasinoOfferRequiredField =
  | "cash_stake"
  | "credit_amount"
  | "bonus_amount"
  | "wager_multiplier"
  | "wager_target"
  | "required_spins"
  | "spin_stake"
  | "free_spins_awarded"
  | "free_spins_value";

export type CasinoOfferRewardType =
  | "cash"
  | "bonus_credit"
  | "free_spins"
  | "free_play"
  | "cashback"
  | "refund"
  | "mystery"
  | "none"
  | "custom";

export type CasinoOfferCapabilities = {
  requiresQualifyingWager: boolean;
  hasDeposit: boolean;
  hasReward: boolean;
  rewardType: CasinoOfferRewardType;
  hasRewardWagering: boolean;
  supportsSpinCalculation: boolean;
  supportsRtpCalculation: boolean;
  supportsCashback: boolean;
  supportsRefund: boolean;
  rewardValueKnownAtSetup: boolean;
  allowsUnknownReward: boolean;
  supportsConversionCap: boolean;
  supportsFixedSpinCount: boolean;
};

export type CasinoOfferTypeDefinition = {
  label: string;
  displayLabel: string;
  helpText: string;
  legacyAliases: string[];
  enabledTabs: CasinoEditorTabId[];
  fieldGroups: CasinoOfferFieldGroup[];
  requiredFields: CasinoOfferRequiredField[];
  resultOptions: string[];
  capabilities: CasinoOfferCapabilities;
};

const defaultResultOptions = ["Pending", "Win", "Lose", "Void", "Mixed"];
const rewardResultOptions = ["Pending", "Win", "Lose", "Mixed", "Void"];
const cashbackResultOptions = ["Pending", "Win", "Lose", "Void"];

const defaultCapabilities: CasinoOfferCapabilities = {
  requiresQualifyingWager: false,
  hasDeposit: false,
  hasReward: false,
  rewardType: "none",
  hasRewardWagering: false,
  supportsSpinCalculation: false,
  supportsRtpCalculation: false,
  supportsCashback: false,
  supportsRefund: false,
  rewardValueKnownAtSetup: true,
  allowsUnknownReward: false,
  supportsConversionCap: false,
  supportsFixedSpinCount: false,
};

function capabilities(
  overrides: Partial<CasinoOfferCapabilities>
): CasinoOfferCapabilities {
  return {
    ...defaultCapabilities,
    ...overrides,
  };
}

export const casinoOfferTypeDefinitions: CasinoOfferTypeDefinition[] = [
  {
    label: "Wager To Earn Reward",
    displayLabel: "Wager & Get Reward",
    helpText: "Wager a qualifying amount, then record the reward and any reward wagering.",
    legacyAliases: ["Wager"],
    enabledTabs: ["setup", "campaign", "reward", "settlement", "advanced"],
    fieldGroups: ["cashStake", "bonusAmount", "wagering", "spinStake", "rewardValue"],
    requiredFields: [
      "cash_stake",
      "bonus_amount",
      "wager_multiplier",
      "wager_target",
      "spin_stake",
      "free_spins_value",
    ],
    resultOptions: defaultResultOptions,
    capabilities: capabilities({
      requiresQualifyingWager: true,
      hasReward: true,
      rewardType: "bonus_credit",
      hasRewardWagering: true,
      supportsSpinCalculation: true,
      supportsRtpCalculation: true,
    }),
  },
  {
    label: "Deposit And Bonus Wagering",
    displayLabel: "Deposit Bonus Wagering",
    helpText: "Deposit or stake cash, then wager the bonus or combined balance before settlement.",
    legacyAliases: ["Deposit Bonus"],
    enabledTabs: ["setup", "campaign", "reward", "settlement", "advanced"],
    fieldGroups: ["cashStake", "bonusAmount", "wagering", "spinStake", "rewardValue"],
    requiredFields: [
      "cash_stake",
      "bonus_amount",
      "wager_multiplier",
      "wager_target",
      "spin_stake",
      "free_spins_value",
    ],
    resultOptions: defaultResultOptions,
    capabilities: capabilities({
      requiresQualifyingWager: true,
      hasDeposit: true,
      hasReward: true,
      rewardType: "bonus_credit",
      hasRewardWagering: true,
      supportsSpinCalculation: true,
      supportsRtpCalculation: true,
    }),
  },
  {
    label: "Free Spins",
    displayLabel: "Free Spins",
    helpText: "Record free spins, spin stake, and the cash converted from those spins.",
    legacyAliases: ["Free Spins"],
    enabledTabs: ["setup", "reward", "settlement", "advanced"],
    fieldGroups: ["spinStake", "awardedSpins", "rewardValue"],
    requiredFields: ["spin_stake", "free_spins_awarded", "free_spins_value"],
    resultOptions: rewardResultOptions,
    capabilities: capabilities({
      hasReward: true,
      rewardType: "free_spins",
      hasRewardWagering: true,
      supportsSpinCalculation: true,
      supportsConversionCap: true,
      supportsFixedSpinCount: true,
    }),
  },
  {
    label: "Fixed Spins Or Free Play",
    displayLabel: "Free Play / Fixed Spins",
    helpText: "Use for fixed free-play credit, scratch cards, lotto tickets, or fixed spin counts.",
    legacyAliases: ["Free Play"],
    enabledTabs: ["setup", "reward", "settlement", "advanced"],
    fieldGroups: ["creditAmount", "requiredSpins", "spinStake", "rewardValue"],
    requiredFields: ["credit_amount", "spin_stake", "required_spins", "free_spins_value"],
    resultOptions: rewardResultOptions,
    capabilities: capabilities({
      hasReward: true,
      rewardType: "free_play",
      hasRewardWagering: true,
      supportsSpinCalculation: true,
      supportsConversionCap: true,
      supportsFixedSpinCount: true,
    }),
  },
  {
    label: "Risk-Free / Refund",
    displayLabel: "Risk-Free / Refund",
    helpText: "Stake cash and record the refund, bonus, or returned value if the offer condition hits.",
    legacyAliases: ["Risk Free"],
    enabledTabs: ["setup", "campaign", "reward", "settlement", "advanced"],
    fieldGroups: ["cashStake", "creditAmount", "rewardValue"],
    requiredFields: ["cash_stake", "credit_amount", "free_spins_value"],
    resultOptions: rewardResultOptions,
    capabilities: capabilities({
      requiresQualifyingWager: true,
      hasReward: true,
      rewardType: "refund",
      supportsRtpCalculation: true,
      supportsRefund: true,
    }),
  },
  {
    label: "Cashback / Loss Back",
    displayLabel: "Cashback / Loss Back",
    helpText: "Stake cash and record the cashback or loss-back amount returned by the casino.",
    legacyAliases: ["Cashback"],
    enabledTabs: ["setup", "campaign", "settlement", "advanced"],
    fieldGroups: ["cashStake", "creditAmount"],
    requiredFields: ["cash_stake", "credit_amount"],
    resultOptions: cashbackResultOptions,
    capabilities: capabilities({
      requiresQualifyingWager: true,
      rewardType: "cashback",
      supportsRtpCalculation: true,
      supportsCashback: true,
      hasReward: true,
    }),
  },
  {
    label: "Fixed Wagering Requirement",
    displayLabel: "Turnover Target",
    helpText: "Use when the offer gives a fixed wagering or turnover target to complete.",
    legacyAliases: [],
    enabledTabs: ["setup", "campaign", "reward", "settlement", "advanced"],
    fieldGroups: ["cashStake", "wagering", "spinStake"],
    requiredFields: ["cash_stake", "wager_target", "spin_stake"],
    resultOptions: defaultResultOptions,
    capabilities: capabilities({
      requiresQualifyingWager: true,
      supportsSpinCalculation: true,
      supportsRtpCalculation: true,
    }),
  },
  {
    label: "No-Deposit Bonus / Bonus Credit",
    displayLabel: "No-Deposit Bonus",
    helpText: "Record bonus credit awarded without a deposit, then track wagering or conversion.",
    legacyAliases: ["No Deposit Bonus", "Bonus Credit"],
    enabledTabs: ["setup", "campaign", "settlement", "advanced"],
    fieldGroups: ["bonusAmount", "wagering", "spinStake"],
    requiredFields: ["bonus_amount", "wager_multiplier", "wager_target", "spin_stake"],
    resultOptions: defaultResultOptions,
    capabilities: capabilities({
      hasReward: true,
      rewardType: "bonus_credit",
      hasRewardWagering: true,
      supportsSpinCalculation: true,
      supportsRtpCalculation: true,
    }),
  },
  {
    label: "Wager To Earn Free Spins",
    displayLabel: "Wager & Get Free Spins",
    helpText: "Wager a qualifying amount to unlock free spins, then record spin conversion.",
    legacyAliases: ["Wager And Get Free Spins", "Wager To Get Free Spins"],
    enabledTabs: ["setup", "campaign", "reward", "settlement", "advanced"],
    fieldGroups: ["cashStake", "wagering", "spinStake", "awardedSpins", "rewardValue"],
    requiredFields: ["cash_stake", "wager_target", "spin_stake", "free_spins_awarded", "free_spins_value"],
    resultOptions: rewardResultOptions,
    capabilities: capabilities({
      requiresQualifyingWager: true,
      hasReward: true,
      rewardType: "free_spins",
      hasRewardWagering: true,
      supportsSpinCalculation: true,
      supportsRtpCalculation: true,
      supportsConversionCap: true,
      supportsFixedSpinCount: true,
    }),
  },
  {
    label: "Deposit To Receive Free Spins",
    displayLabel: "Deposit & Get Free Spins",
    helpText: "Deposit to unlock free spins, then record spin stake and converted win amount.",
    legacyAliases: ["Deposit And Get Free Spins", "Deposit Free Spins"],
    enabledTabs: ["setup", "campaign", "reward", "settlement", "advanced"],
    fieldGroups: ["cashStake", "awardedSpins", "spinStake", "rewardValue"],
    requiredFields: ["cash_stake", "free_spins_awarded", "spin_stake", "free_spins_value"],
    resultOptions: rewardResultOptions,
    capabilities: capabilities({
      hasDeposit: true,
      hasReward: true,
      rewardType: "free_spins",
      hasRewardWagering: true,
      supportsSpinCalculation: true,
      supportsConversionCap: true,
      supportsFixedSpinCount: true,
    }),
  },
  {
    label: "Wagering / Turnover Challenge",
    displayLabel: "Turnover Challenge",
    helpText: "Complete a wagering target, usually by repeating spins at a chosen stake.",
    legacyAliases: ["Turnover Challenge"],
    enabledTabs: ["setup", "campaign", "settlement", "advanced"],
    fieldGroups: ["cashStake", "wagering", "spinStake"],
    requiredFields: ["wager_target", "spin_stake"],
    resultOptions: defaultResultOptions,
    capabilities: capabilities({
      requiresQualifyingWager: true,
      supportsSpinCalculation: true,
      supportsRtpCalculation: true,
    }),
  },
  {
    label: "Daily / Recurring Casino Reward",
    displayLabel: "Daily / Recurring Reward",
    helpText: "Use for recurring reloads, daily rewards, or repeat casino tasks.",
    legacyAliases: ["Reload / Recurring Casino Bonus", "Reload Bonus", "Daily Casino Reward"],
    enabledTabs: ["setup", "campaign", "reward", "settlement", "advanced"],
    fieldGroups: ["cashStake", "bonusAmount", "wagering", "spinStake", "rewardValue"],
    requiredFields: [
      "cash_stake",
      "bonus_amount",
      "wager_multiplier",
      "wager_target",
      "spin_stake",
      "free_spins_value",
    ],
    resultOptions: defaultResultOptions,
    capabilities: capabilities({
      requiresQualifyingWager: true,
      hasReward: true,
      rewardType: "custom",
      hasRewardWagering: true,
      supportsSpinCalculation: true,
      supportsRtpCalculation: true,
      allowsUnknownReward: true,
    }),
  },
  {
    label: "Prize / Mystery Reward",
    displayLabel: "Prize / Mystery Reward",
    helpText: "Use when the reward value is unknown until the prize or mystery reward is revealed.",
    legacyAliases: [],
    enabledTabs: ["setup", "reward", "settlement", "advanced"],
    fieldGroups: ["rewardValue"],
    requiredFields: [],
    resultOptions: rewardResultOptions,
    capabilities: capabilities({
      hasReward: true,
      rewardType: "mystery",
      allowsUnknownReward: true,
      rewardValueKnownAtSetup: false,
    }),
  },
  {
    label: "Other / Custom",
    displayLabel: "Other / Custom",
    helpText: "Use only when the offer does not match a standard casino workflow.",
    legacyAliases: ["None"],
    enabledTabs: ["setup", "settlement", "advanced"],
    fieldGroups: [],
    requiredFields: [],
    resultOptions: defaultResultOptions,
    capabilities: capabilities({
      allowsUnknownReward: true,
      rewardValueKnownAtSetup: false,
      rewardType: "custom",
    }),
  },
];

const definitionsByLabel = new Map(
  casinoOfferTypeDefinitions.map((definition) => [definition.label.toLowerCase(), definition])
);
const definitionsByAlias = new Map(
  casinoOfferTypeDefinitions.flatMap((definition) =>
    definition.legacyAliases.map((alias) => [alias.toLowerCase(), definition] as const)
  )
);

export function getCasinoOfferTypeDefinition(value: string): CasinoOfferTypeDefinition | null {
  const key = value.trim().toLowerCase();
  if (!key) return null;
  return definitionsByLabel.get(key) ?? definitionsByAlias.get(key) ?? null;
}

export function normalizeCasinoOfferType(value: string): string {
  return getCasinoOfferTypeDefinition(value)?.label ?? value.trim();
}

export function getCasinoOfferTypeOptions(currentOfferType = ""): string[] {
  const options = casinoOfferTypeDefinitions.map((definition) => definition.label);
  const normalizedCurrent = normalizeCasinoOfferType(currentOfferType);
  return [...new Set([...options, normalizedCurrent].filter(Boolean))];
}

export function getCasinoOfferTypeDisplayLabel(value: string): string {
  return getCasinoOfferTypeDefinition(value)?.displayLabel ?? value.trim();
}

export function getCasinoOfferTypeHelpText(value: string): string {
  return (
    getCasinoOfferTypeDefinition(value)?.helpText ??
    "Use this custom casino workflow only when no standard offer type fits."
  );
}

export function casinoOfferTypeUsesTab(
  offerType: string,
  tabId: CasinoEditorTabId
): boolean {
  const definition = getCasinoOfferTypeDefinition(offerType);
  if (!definition) return tabId === "setup" || tabId === "settlement" || tabId === "advanced";
  return definition.enabledTabs.includes(tabId);
}

export function casinoOfferTypeUsesFieldGroup(
  offerType: string,
  fieldGroup: CasinoOfferFieldGroup
): boolean {
  return getCasinoOfferTypeDefinition(offerType)?.fieldGroups.includes(fieldGroup) ?? false;
}

export function getCasinoOfferRequiredFields(offerType: string): CasinoOfferRequiredField[] {
  return getCasinoOfferTypeDefinition(offerType)?.requiredFields ?? [];
}

export function getCasinoOfferResultOptions(offerType: string): string[] {
  return getCasinoOfferTypeDefinition(offerType)?.resultOptions ?? defaultResultOptions;
}

export function getCasinoOfferCapabilities(offerType: string): CasinoOfferCapabilities {
  return getCasinoOfferTypeDefinition(offerType)?.capabilities ?? defaultCapabilities;
}
