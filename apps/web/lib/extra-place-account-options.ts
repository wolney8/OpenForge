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
  usage: Record<string, number> = {},
) {
  return [...new Set(labels)].sort((left, right) => {
    if (left === current) return -1;
    if (right === current) return 1;
    const usageDifference = (usage[right] ?? 0) - (usage[left] ?? 0);
    return usageDifference || left.localeCompare(right);
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
