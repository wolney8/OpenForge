import {
  getAccountNamesByType,
  type AccountAuthorityRecord,
} from "./account-authorities";
import { dedupeOptions } from "./workbook-options";

export function resolveExtraPlaceAccountOptions({
  accounts,
  currentBookmaker = "",
  currentPlaceExchange = "",
  currentWinExchange = "",
  rows,
}: {
  accounts: AccountAuthorityRecord[];
  currentBookmaker?: string;
  currentPlaceExchange?: string;
  currentWinExchange?: string;
  rows: Array<Record<string, string | null | undefined>>;
}) {
  return {
    bookmakers: dedupeOptions([
      ...getAccountNamesByType(accounts, "Bookie"),
      ...rows.map((row) => row.bookmaker ?? ""),
      currentBookmaker,
    ]),
    exchanges: dedupeOptions([
      ...getAccountNamesByType(accounts, "Exchange"),
      ...rows.flatMap((row) => [
        row.win_exchange ?? "",
        row.place_exchange ?? "",
      ]),
      currentWinExchange,
      currentPlaceExchange,
    ]),
  };
}

export function resolveExtraPlacePreferredExchange(
  preferredExchange: string | null | undefined,
  exchangeOptions: string[],
) {
  const normalized = preferredExchange?.trim().toLocaleLowerCase();
  if (!normalized) return "";
  return (
    exchangeOptions.find(
      (option) => option.trim().toLocaleLowerCase() === normalized,
    ) ?? ""
  );
}

export function prioritiseExtraPlaceAccountOptions(
  labels: string[],
  current = "",
  accounts: AccountAuthorityRecord[] = [],
  sameWorkflowUsage: Array<{ provider: string; usedAt: string }> = [],
  otherWorkflowUsage: Array<{ provider: string; usedAt: string }> = [],
) {
  const normalize = (value: string) => value.trim().toLocaleLowerCase();
  const latestUse = (events: Array<{ provider: string; usedAt: string }>) => {
    const result = new Map<string, number>();
    events.forEach(({ provider, usedAt }) => {
      const timestamp = Date.parse(usedAt);
      if (!provider.trim() || !Number.isFinite(timestamp)) return;
      const key = normalize(provider);
      result.set(key, Math.max(result.get(key) ?? Number.NEGATIVE_INFINITY, timestamp));
    });
    return result;
  };
  const sameWorkflow = latestUse(sameWorkflowUsage);
  const otherWorkflow = latestUse(otherWorkflowUsage);
  const accountByName = new Map(accounts.map((account) => [normalize(account.account), account]));
  return [...new Set(labels)].sort((left, right) => {
    if (left === current) return -1;
    if (right === current) return 1;
    const leftKey = normalize(left);
    const rightKey = normalize(right);
    const sameDifference = (sameWorkflow.get(rightKey) ?? -1) - (sameWorkflow.get(leftKey) ?? -1);
    if (sameDifference) return sameDifference;
    const otherDifference = (otherWorkflow.get(rightKey) ?? -1) - (otherWorkflow.get(leftKey) ?? -1);
    if (otherDifference) return otherDifference;
    const positiveBalance = (label: string) => {
      const balance = Number(accountByName.get(normalize(label))?.current_balance);
      return Number.isFinite(balance) && balance > 0 ? 1 : 0;
    };
    const balanceDifference = positiveBalance(right) - positiveBalance(left);
    return balanceDifference || left.localeCompare(right, "en-GB", { sensitivity: "base" });
  });
}

export function filterExtraPlaceQuickAccountOptions(
  labels: string[],
  accounts: AccountAuthorityRecord[],
  current = "",
) {
  const normalize = (value: string) => value.trim().toLocaleLowerCase();
  const accountByName = new Map(accounts.map((account) => [normalize(account.account), account]));
  return labels.filter((label) => {
    if (normalize(label) === normalize(current)) return true;
    return accountByName.get(normalize(label))?.extra_places_allows_planning !== false;
  });
}

export function prioritiseExtraPlaceTerms(
  labels: string[],
  rows: Array<Record<string, string | null | undefined>>,
  current = "",
) {
  const usage = new Map<string, { count: number; latest: number }>();
  rows.forEach((row) => {
    if (row.status === "Prospecting") return;
    const bookmakerPlaces = row.bookmaker_places?.trim();
    const exchangePlaces = row.exchange_places?.trim();
    if (!bookmakerPlaces || !exchangePlaces) return;
    const label = `Paying ${bookmakerPlaces} instead of ${exchangePlaces}`;
    const timestamp = Date.parse(row.placed_at ?? "");
    const existing = usage.get(label) ?? { count: 0, latest: -1 };
    usage.set(label, {
      count: existing.count + 1,
      latest: Number.isFinite(timestamp) ? Math.max(existing.latest, timestamp) : existing.latest,
    });
  });
  return [...new Set(labels)].sort((left, right) => {
    if (left === current) return -1;
    if (right === current) return 1;
    const leftUsage = usage.get(left) ?? { count: 0, latest: -1 };
    const rightUsage = usage.get(right) ?? { count: 0, latest: -1 };
    return rightUsage.latest - leftUsage.latest || rightUsage.count - leftUsage.count || labels.indexOf(left) - labels.indexOf(right);
  });
}

export type ExtraPlaceAccountAccess = {
  state: "not_checked" | "warning" | "planning" | "blocked";
  reason: string;
  allowsPlanning: boolean;
  allowsOperationalUse: boolean;
};

export function resolveExtraPlaceAccountAccess(
  accounts: AccountAuthorityRecord[],
  bookmaker: string,
): ExtraPlaceAccountAccess | null {
  const normalized = bookmaker.trim().toLocaleLowerCase();
  if (!normalized) return null;
  const account = accounts.find(
    (row) =>
      row.type === "Bookie" &&
      row.account.trim().toLocaleLowerCase() === normalized,
  );
  if (!account) {
    return {
      state: "blocked",
      reason: "This bookmaker is not configured as a Profile Account.",
      allowsPlanning: false,
      allowsOperationalUse: false,
    };
  }
  return {
    state: account.extra_places_access_state ?? "not_checked",
    reason:
      account.extra_places_access_reason ??
      "Extra Places capability has not been checked for this account.",
    allowsPlanning: account.extra_places_allows_planning ?? true,
    allowsOperationalUse: account.extra_places_allows_operational_use ?? true,
  };
}
