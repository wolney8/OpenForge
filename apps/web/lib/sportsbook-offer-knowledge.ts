import type { AccountAuthorityRecord } from "@/lib/account-authorities";

const SPECIAL_OFFER_BOOKMAKERS: Record<string, readonly string[]> = {
  "Double Delight / Hat-trick Heaven": ["Betfred", "Midnite"],
  "Enhanced Price": ["Betfred", "Midnite", "bet365", "Sky Bet"],
  "Price Boost": ["Betfred", "Midnite", "bet365", "Sky Bet", "Paddy Power"],
  Cashback: ["Betfred", "Midnite", "BetUK", "talkSPORT BET"],
  Refund: ["Betfred", "Midnite", "BetUK", "Sky Bet"],
  "Bonus Lock-In": ["Betfred", "Midnite", "BetUK", "Sky Bet"],
  "Bet Builder": ["bet365", "Sky Bet", "Paddy Power", "Betfred"],
  Acca: ["Betfred", "Sky Bet", "Paddy Power", "bet365"],
  Reload: ["Betfred", "Midnite", "BetUK", "BetMGM"],
  "Weekly Reload": ["Betfred", "Midnite", "BetUK", "BetMGM"],
};

const UNAVAILABLE_BOOKMAKER_STATUSES = new Set([
  "gubbed",
  "bonus restricted",
  "blocked",
  "not using",
  "closed",
  "inactive",
  "archived",
]);

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

function findSpecialOfferKey(input: string): string | null {
  const normalizedInput = normalizeValue(input);
  if (!normalizedInput) {
    return null;
  }

  return (
    Object.keys(SPECIAL_OFFER_BOOKMAKERS).find((offerKey) =>
      normalizedInput.includes(normalizeValue(offerKey))
    ) ?? null
  );
}

type SpecialOfferKnowledgeResolution = {
  resolvedOfferKey: string;
  resolutionSource: "offer_type" | "campaign_tag" | "offer";
};

function resolveSpecialOfferKnowledge(options: {
  offerType: string;
  offerName?: string;
  offerText?: string;
}): SpecialOfferKnowledgeResolution | null {
  if (SPECIAL_OFFER_BOOKMAKERS[options.offerType]) {
    return {
      resolvedOfferKey: options.offerType,
      resolutionSource: "offer_type",
    };
  }

  const campaignTagMatch = findSpecialOfferKey(options.offerName ?? "");
  if (campaignTagMatch) {
    return {
      resolvedOfferKey: campaignTagMatch,
      resolutionSource: "campaign_tag",
    };
  }

  const offerTextMatch = findSpecialOfferKey(options.offerText ?? "");
  if (offerTextMatch) {
    return {
      resolvedOfferKey: offerTextMatch,
      resolutionSource: "offer",
    };
  }

  const offerTypeMatch = findSpecialOfferKey(options.offerType);
  if (offerTypeMatch) {
    return {
      resolvedOfferKey: offerTypeMatch,
      resolutionSource: "offer_type",
    };
  }

  return null;
}

export function resolveSpecialOfferKnowledgeKey(options: {
  offerType: string;
  offerName?: string;
  offerText?: string;
}): string | null {
  return resolveSpecialOfferKnowledge(options)?.resolvedOfferKey ?? null;
}

export type SpecialOfferBookmakerSuggestion = {
  resolvedOfferKey: string;
  resolutionSource: "offer_type" | "campaign_tag" | "offer";
  knownBookmakers: string[];
  profileKnownBookmakers: string[];
  availableBookmakers: string[];
  unavailableBookmakers: string[];
  missingKnownBookmakers: string[];
  allKnownBookmakersUnavailableOnProfile: boolean;
  selectedBookmakerState: "available" | "unavailable" | "missing" | null;
};

export function getSpecialOfferBookmakerSuggestion(options: {
  offerType: string;
  offerName?: string;
  offerText?: string;
  bookmaker?: string;
  accountAuthorities: AccountAuthorityRecord[];
}): SpecialOfferBookmakerSuggestion | null {
  const resolvedKnowledge = resolveSpecialOfferKnowledge({
    offerType: options.offerType,
    offerName: options.offerName,
    offerText: options.offerText,
  });
  const knownBookmakers = resolvedKnowledge
    ? SPECIAL_OFFER_BOOKMAKERS[resolvedKnowledge.resolvedOfferKey] ?? []
    : [];

  if (knownBookmakers.length === 0) {
    return null;
  }

  const bookieAuthorities = options.accountAuthorities.filter((row) => row.type === "Bookie");
  const profileKnownBookmakers = bookieAuthorities.filter((row) =>
    knownBookmakers.some((bookmaker) => normalizeValue(bookmaker) === normalizeValue(row.account))
  );

  const availableBookmakers = profileKnownBookmakers
    .filter((row) => !UNAVAILABLE_BOOKMAKER_STATUSES.has(normalizeValue(row.status)))
    .map((row) => row.account);

  const unavailableBookmakers = profileKnownBookmakers
    .filter((row) => UNAVAILABLE_BOOKMAKER_STATUSES.has(normalizeValue(row.status)))
    .map((row) => row.account);

  const profileKnownBookmakerSet = new Set(
    profileKnownBookmakers.map((row) => normalizeValue(row.account))
  );
  const missingKnownBookmakers = knownBookmakers.filter(
    (bookmaker) => !profileKnownBookmakerSet.has(normalizeValue(bookmaker))
  );
  let selectedBookmakerState: "available" | "unavailable" | "missing" | null = null;
  const normalizedSelectedBookmaker = normalizeValue(options.bookmaker ?? "");
  if (normalizedSelectedBookmaker) {
    if (availableBookmakers.some((bookmaker) => normalizeValue(bookmaker) === normalizedSelectedBookmaker)) {
      selectedBookmakerState = "available";
    } else if (
      unavailableBookmakers.some((bookmaker) => normalizeValue(bookmaker) === normalizedSelectedBookmaker)
    ) {
      selectedBookmakerState = "unavailable";
    } else if (knownBookmakers.some((bookmaker) => normalizeValue(bookmaker) === normalizedSelectedBookmaker)) {
      selectedBookmakerState = "missing";
    }
  }

  return {
    resolvedOfferKey: resolvedKnowledge?.resolvedOfferKey ?? "",
    resolutionSource: resolvedKnowledge?.resolutionSource ?? "offer_type",
    knownBookmakers: [...knownBookmakers],
    profileKnownBookmakers: profileKnownBookmakers.map((row) => row.account),
    availableBookmakers: [...new Set(availableBookmakers)],
    unavailableBookmakers: [...new Set(unavailableBookmakers)],
    missingKnownBookmakers,
    allKnownBookmakersUnavailableOnProfile:
      profileKnownBookmakers.length > 0 && availableBookmakers.length === 0,
    selectedBookmakerState,
  };
}
