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
