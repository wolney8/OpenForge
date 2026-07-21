import type { AccountAuthorityRecord } from "@/lib/account-authorities";

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

function parseRestrictions(row: AccountAuthorityRecord): Set<string> {
  let parsed: string[] = [];
  try {
    const value = JSON.parse(row.restrictions_json || "[]") as unknown;
    parsed = Array.isArray(value) ? value.map(String) : [];
  } catch {
    parsed = [];
  }
  return new Set(
    [row.status, row.lifecycle_status || "", ...parsed]
      .map(normalizeValue)
      .filter(Boolean)
  );
}

export type BookmakerCoverageState = "available" | "warning" | "blocked" | "not_signed_up";

export type KnownBookmakerCoverage = {
  bookmaker: string;
  state: BookmakerCoverageState;
  selectable: boolean;
  reason: string;
};

export function resolveKnownBookmakerCoverage(options: {
  knownBookmakers: string[];
  accountAuthorities: AccountAuthorityRecord[];
  offerType: string;
}): KnownBookmakerCoverage[] {
  const bookieAuthorities = options.accountAuthorities.filter((row) => row.type === "Bookie");
  return options.knownBookmakers.map((bookmaker) => {
    const account = bookieAuthorities.find(
      (row) => normalizeValue(row.account) === normalizeValue(bookmaker)
    );
    if (!account) {
      return {
        bookmaker,
        state: "not_signed_up",
        selectable: false,
        reason: "Not signed up on this profile",
      };
    }
    const states = parseRestrictions(account);
    const blocked = [
      "archived", "blocked", "closed", "gubbed", "inactive", "not using",
      "kyc blocked", "risk blocked", "suspended", "casino only",
    ].find((value) => states.has(value));
    if (blocked) {
      return {
        bookmaker: account.account,
        state: "blocked",
        selectable: false,
        reason: blocked === "casino only" ? "Casino-only account" : `Account is ${blocked}`,
      };
    }
    if (states.has("bonus restricted") && options.offerType !== "Mug Bet") {
      return {
        bookmaker: account.account,
        state: "warning",
        selectable: false,
        reason: "Bonus restricted; this promotional combo cannot be used",
      };
    }
    const warning = ["soft limited", "limited", "pending sign up"].find((value) => states.has(value));
    if (warning) {
      return {
        bookmaker: account.account,
        state: "warning",
        selectable: warning !== "pending sign up",
        reason: warning === "pending sign up" ? "Sign-up is still pending" : "Stake or promotion may be limited",
      };
    }
    return {
      bookmaker: account.account,
      state: "available",
      selectable: true,
      reason: "Active and eligible on this profile",
    };
  });
}

export type SpecialOfferBookmakerSuggestion = {
  resolvedOfferKey: string;
  resolutionSource: "common_combo";
  knownBookmakers: string[];
  profileKnownBookmakers: string[];
  availableBookmakers: string[];
  warningBookmakers: KnownBookmakerCoverage[];
  unavailableBookmakers: string[];
  missingKnownBookmakers: string[];
  coverage: KnownBookmakerCoverage[];
  allKnownBookmakersUnavailableOnProfile: boolean;
  selectedBookmakerState: BookmakerCoverageState | null;
};

export function getSpecialOfferBookmakerSuggestion(options: {
  offerType: string;
  bookmaker?: string;
  accountAuthorities: AccountAuthorityRecord[];
  knownBookmakers?: string[];
  knowledgeLabel?: string;
}): SpecialOfferBookmakerSuggestion | null {
  const knownBookmakers = [...new Set(options.knownBookmakers ?? [])];
  if (!knownBookmakers.length) return null;
  const coverage = resolveKnownBookmakerCoverage({
    knownBookmakers,
    accountAuthorities: options.accountAuthorities,
    offerType: options.offerType,
  });
  const available = coverage.filter((row) => row.state === "available");
  const warning = coverage.filter((row) => row.state === "warning");
  const blocked = coverage.filter((row) => row.state === "blocked");
  const missing = coverage.filter((row) => row.state === "not_signed_up");
  const selected = coverage.find(
    (row) => normalizeValue(row.bookmaker) === normalizeValue(options.bookmaker ?? "")
  );
  return {
    resolvedOfferKey: options.knowledgeLabel || options.offerType || "Common combo",
    resolutionSource: "common_combo",
    knownBookmakers,
    profileKnownBookmakers: [...available, ...warning, ...blocked].map((row) => row.bookmaker),
    availableBookmakers: available.map((row) => row.bookmaker),
    warningBookmakers: warning,
    unavailableBookmakers: blocked.map((row) => row.bookmaker),
    missingKnownBookmakers: missing.map((row) => row.bookmaker),
    coverage,
    allKnownBookmakersUnavailableOnProfile:
      coverage.some((row) => row.state !== "not_signed_up") &&
      coverage.every((row) => !row.selectable),
    selectedBookmakerState: selected?.state ?? null,
  };
}
