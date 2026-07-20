export const sportsbookStatusOptions = [
  "Prospecting",
  "Not Placed",
  "Placed",
  "Settled",
  "Void",
  "Cancelled",
  "Error",
  "Free Bet Awarded",
] as const;

export const sportsbookResultOptions = [
  "Pending",
  "Outcome 1 Won",
  "Back Won",
  "Win",
  "Lay Won",
  "Lose",
  "No Selection Won",
  "Lay Won + Cashback",
  "Outcome 2 Won",
  "Outcome 3 Won",
  "Void",
  "Mixed",
] as const;

export const sportsbookStrategyOptions = [
  "Standard",
  "Underlay",
  "Overlay",
  "Custom",
  "No Lay",
  "Partial Lay",
  "Multilay",
  "Multilay-Underlay",
] as const;

export const sportsbookOfferTypeOptions = [
  "Sign up / Welcome",
  "Bet & Get",
  "Double Delight / Hat-trick Heaven",
  "Mug Bet",
  "Enhanced Price",
  "Price Boost",
  "Profit Boost",
  "Cashback",
  "Bonus Lock-In",
  "Weekly Reload",
  "2UP / Early Payout",
  "BOG / Best Odds Guaranteed",
  "Each Way",
  "Extra Places",
] as const;

export const legacySportsbookOfferTypeOptions = ["None", "Bet Builder", "Acca"] as const;

type OfferTypeDescriptor = {
  calculatorFamily: string;
  summary: string;
};

const offerTypeDescriptors: Record<string, OfferTypeDescriptor> = {
  "Sign up / Welcome": {
    calculatorFamily: "standard qualifying",
    summary: "Welcome or sign-up qualifying mechanic.",
  },
  "Bet & Get": {
    calculatorFamily: "standard qualifying",
    summary: "Qualifying bet that can later bridge into a free-bet workflow.",
  },
  "Double Delight / Hat-trick Heaven": {
    calculatorFamily: "DDHH",
    summary: "First-goalscorer offer family with named multi-outcome settlement branches.",
  },
  "Mug Bet": {
    calculatorFamily: "no-lay",
    summary: "Operational no-lay workflow where exchange matching stays out of scope.",
  },
  "Enhanced Price": {
    calculatorFamily: "standard qualifying",
    summary: "Boosted-price qualifying mechanic using ordinary win/lose settlement paths.",
  },
  "Price Boost": {
    calculatorFamily: "standard qualifying",
    summary: "Boost mechanic that may later pair with named outcome workflows.",
  },
  "Profit Boost": {
    calculatorFamily: "profit boost",
    summary: "Profit-only percentage boost or bookmaker-displayed boosted odds.",
  },
  Cashback: {
    calculatorFamily: "cashback / bonus-lock-in",
    summary: "Trigger-based refund or cashback family with explicit branch wording.",
  },
  "Bonus Lock-In": {
    calculatorFamily: "cashback / bonus-lock-in",
    summary: "Refund-style trigger family using retained-bonus assumptions.",
  },
  "Weekly Reload": {
    calculatorFamily: "reload / recurring promo",
    summary: "Broad recurring-promo placeholder; actual mechanic should be clarified where possible.",
  },
  None: {
    calculatorFamily: "placeholder / legacy",
    summary: "Legacy placeholder only; prefer a concrete offer family on new rows.",
  },
  "Bet Builder": {
    calculatorFamily: "legacy offer-type",
    summary: "Legacy value retained for older rows; preferred long-term home is Bet Type.",
  },
  Acca: {
    calculatorFamily: "legacy offer-type",
    summary: "Legacy value retained for older rows; preferred long-term home is Bet Type.",
  },
};

export const betTypeOptions = [
  "Single",
  "In Play + Single",
  "Bet Builder",
  "In Play + Bet Builder",
  "Accumulator / Multiple",
  "Correct Score",
  "First Goalscorer",
] as const;

const offerTypeBetTypeMap: Record<string, readonly string[]> = {
  "Sign up / Welcome": ["Single"],
  "Bet & Get": [
    "Single",
    "Bet Builder",
    "Accumulator / Multiple",
    "In Play + Single",
    "In Play + Bet Builder",
  ],
  "Enhanced Price": ["Single", "First Goalscorer", "Correct Score"],
  "Price Boost": [
    "Single",
    "First Goalscorer",
    "Correct Score",
    "Accumulator / Multiple",
  ],
  "Profit Boost": ["Single", "Bet Builder", "Accumulator / Multiple"],
  Cashback: ["Single", "First Goalscorer", "Accumulator / Multiple", "In Play + Single"],
  "Bonus Lock-In": ["Single", "First Goalscorer", "Accumulator / Multiple", "In Play + Single"],
  "Weekly Reload": ["Single", "Bet Builder", "Accumulator / Multiple", "In Play + Single"],
  "Double Delight / Hat-trick Heaven": ["First Goalscorer"],
  "Mug Bet": ["Single"],
  "Bet Builder": ["Bet Builder"],
  Acca: ["Accumulator / Multiple"],
  "2UP / Early Payout": ["Single"],
  "BOG / Best Odds Guaranteed": ["Single"],
  "Each Way": ["Each Way"],
  "Extra Places": ["Each Way"],
} as const;

const offerTypeCampaignTagKeywords: Record<string, readonly string[]> = {
  "Sign up / Welcome": ["welcome", "sign up", "signup"],
  "Bet & Get": ["bet", "get"],
  "Enhanced Price": ["enhanced", "price"],
  "Price Boost": ["boost", "price"],
  "Profit Boost": ["boost", "profit"],
  Cashback: ["cashback", "cash back", "money back"],
  "Bonus Lock-In": ["refund", "bonus lock", "money back", "lose"],
  "Double Delight / Hat-trick Heaven": [
    "ddhh",
    "double delight",
    "hat-trick heaven",
    "hat trick heaven",
  ],
  "Weekly Reload": ["reload", "club", "daily", "weekly", "midweek", "friday", "saturday"],
  "2UP / Early Payout": ["2up", "early payout"],
  "BOG / Best Odds Guaranteed": ["bog", "best odds guaranteed"],
  "Each Way": ["each way"],
  "Extra Places": ["extra place", "extra places"],
} as const;

export const fixtureTypeOptions = [
  "Football",
  "Horse Racing",
  "Greyhound Racing",
  "Tennis",
  "Basketball",
  "Golf",
  "Cricket",
  "Rugby Union",
  "Rugby League",
  "Darts",
  "Snooker",
  "Boxing",
  "MMA / UFC",
  "Motor Racing",
  "Cycling",
  "American Football",
  "Baseball",
  "Ice Hockey",
  "eSports",
  "Politics",
  "Public Event / Entertainment",
  "Virtual Sports",
  "Other",
] as const;

export const freeBetStatusOptions = [
  "Prospecting",
  "Available",
  "Placed",
  "Settled",
  "Expired",
  "Void",
  "Converted",
  "Error",
  "Not Yet Awarded",
] as const;

export const freeBetResultOptions = [
  "Pending",
  "Back Won",
  "Win",
  "Lay Won",
  "Lose",
  "Void",
] as const;

export const freeBetRetentionModeOptions = ["SNR", "SR"] as const;

export const freeBetStrategyOptions = [
  "Standard",
  "Underlay",
  "Overlay",
  "Custom",
  "No Lay",
  "Partial Lay",
] as const;

export const cashAdjustmentDirectionOptions = ["In", "Out", "Correction"] as const;

export const cashAdjustmentTypeOptions = [
  "Correction",
  "Deduction",
  "Deposit",
  "Subscription",
  "TopUp",
  "Withdrawal",
] as const;

export const casinoOfferStatusOptions = [
  "Prospecting",
  "Started",
  "In Progress",
  "Settled",
  "Expired",
  "Cancelled",
  "Error",
] as const;

export const casinoOfferResultOptions = [
  "Pending",
  "Win",
  "Lose",
  "Void",
  "Mixed",
] as const;

export const casinoOfferTypeOptions = [
  "Wager",
  "Free Spins",
  "Free Play",
  "Risk Free",
  "Deposit Bonus",
  "Cashback",
  "None",
] as const;

export const accountTypeOptions = ["Bookie", "Exchange", "Bank"] as const;

export const accountChannelOptions = ["Online", "Retail", "Unknown"] as const;

export const accountStatusOptions = [
  "Not Signed Up",
  "Pending Sign Up",
  "Verification Pending",
  "Active",
  "Bonus Restricted",
  "Soft Limited",
  "Limited",
  "Casino Only",
  "Sportsbook Only",
  "KYC Blocked",
  "Risk Blocked",
  "Deposit Restricted",
  "Withdrawal Restricted",
  "Suspended",
  "Gubbed",
  "Blocked",
  "Not Using",
  "Closed",
  "Inactive",
  "Archived",
] as const;

export const accountLifecycleOptions = [
  "Not Signed Up",
  "Pending Sign Up",
  "Verification Pending",
  "Active",
  "Suspended",
  "Closed",
  "Archived",
] as const;

export const accountRestrictionOptions = [
  "Bonus Restricted",
  "Soft Limited",
  "Casino Only",
  "Sportsbook Only",
  "KYC Blocked",
  "Risk Blocked",
  "Deposit Restricted",
  "Withdrawal Restricted",
] as const;

export function normalizeSportsbookOfferType(value: string): string {
  const normalized = value.trim();
  if (normalized === "Refund") return "Bonus Lock-In";
  if (normalized === "Reload") return "Weekly Reload";
  return normalized;
}

export function normalizeSportsbookBetType(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  if (normalized === "Acca" || normalized === "Accumulator") {
    return "Accumulator / Multiple";
  }

  return normalized;
}

export function getDefaultBetTypeForOfferType(offerType: string, currentBetType: string): string {
  const normalizedCurrentBetType = normalizeSportsbookBetType(currentBetType);
  const mappedBetTypes = offerTypeBetTypeMap[normalizeSportsbookOfferType(offerType)];
  if (
    normalizedCurrentBetType &&
    (!mappedBetTypes || mappedBetTypes.includes(normalizedCurrentBetType))
  ) {
    return normalizedCurrentBetType;
  }

  if (mappedBetTypes && mappedBetTypes.length > 0) {
    return mappedBetTypes[0];
  }

  if (normalizedCurrentBetType) {
    return normalizedCurrentBetType;
  }

  return "Single";
}

export function getAllowedBetTypesForOfferType(
  offerType: string,
  currentBetType = ""
): string[] {
  const normalizedCurrentBetType = normalizeSportsbookBetType(currentBetType);
  const mappedBetTypes = offerTypeBetTypeMap[normalizeSportsbookOfferType(offerType)];
  const baseOptions = mappedBetTypes ? [...mappedBetTypes] : [...betTypeOptions];
  return dedupeOptions([...baseOptions, normalizedCurrentBetType]);
}

export function getOfferTypeOptions(currentOfferType = ""): string[] {
  return dedupeOptions([
    ...sportsbookOfferTypeOptions,
    normalizeSportsbookOfferType(currentOfferType),
  ]);
}

export function getOfferTypeDescriptor(offerType: string): OfferTypeDescriptor | null {
  return offerTypeDescriptors[normalizeSportsbookOfferType(offerType)] ?? null;
}

export function filterCampaignTagOptions(
  values: string[],
  options: {
    offerType: string;
    currentValue?: string;
  }
): string[] {
  const allOptions = dedupeOptions([...values, options.currentValue ?? ""]);
  const normalizedCurrentValue = options.currentValue?.trim() ?? "";
  const keywords = offerTypeCampaignTagKeywords[options.offerType.trim()];
  if (!keywords || keywords.length === 0) {
    return allOptions;
  }

  const filtered = allOptions.filter((value) => {
    const lowered = value.toLowerCase();
    return keywords.some((keyword) => lowered.includes(keyword));
  });

  if (filtered.length === 0) {
    return allOptions;
  }

  return dedupeOptions([...filtered, normalizedCurrentValue]);
}

export function dedupeOptions(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right)
  );
}
