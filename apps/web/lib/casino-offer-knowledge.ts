import type { AccountAuthorityRecord } from "@/lib/account-authorities";
import type { KnownBookmakerCoverage } from "@/lib/sportsbook-offer-knowledge";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function accountStates(account: AccountAuthorityRecord): Set<string> {
  let restrictions: string[] = [];
  try {
    const parsed = JSON.parse(account.restrictions_json || "[]") as unknown;
    restrictions = Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    restrictions = [];
  }
  return new Set(
    [account.status, account.lifecycle_status || "", ...restrictions]
      .map(normalize)
      .filter(Boolean)
  );
}

export function resolveCasinoBookmakerCoverage(options: {
  knownBookmakers: string[];
  accountAuthorities: AccountAuthorityRecord[];
}): KnownBookmakerCoverage[] {
  const accounts = options.accountAuthorities.filter((row) => row.type === "Bookie");
  return options.knownBookmakers.map((bookmaker) => {
    const account = accounts.find((row) => normalize(row.account) === normalize(bookmaker));
    if (!account) {
      return { bookmaker, state: "not_signed_up", selectable: false, reason: "Not signed up on this profile" };
    }
    const states = accountStates(account);
    const blocked = [
      "archived", "blocked", "closed", "gubbed", "inactive", "not using",
      "kyc blocked", "risk blocked", "suspended", "sportsbook only",
    ].find((state) => states.has(state));
    if (blocked) {
      return {
        bookmaker: account.account,
        state: "blocked",
        selectable: false,
        reason: blocked === "sportsbook only" ? "Sportsbook-only account" : `Account is ${blocked}`,
      };
    }
    const restricted = ["bonus restricted", "soft limited", "limited"].find((state) => states.has(state));
    if (restricted) {
      return {
        bookmaker: account.account,
        state: "warning",
        selectable: true,
        reason: restricted === "bonus restricted"
          ? "Bonus restricted; verify this casino promotion is available"
          : "Account restrictions may affect this offer",
      };
    }
    if (states.has("pending sign up")) {
      return {
        bookmaker: account.account,
        state: "warning",
        selectable: false,
        reason: "Sign-up is still pending",
      };
    }
    return {
      bookmaker: account.account,
      state: "available",
      selectable: true,
      reason: "Active and casino-capable on this profile",
    };
  });
}
