import { apiBaseUrl } from "@/lib/api";
import { formatApiErrorBody } from "@/lib/api-error";
import type { AccountAuthorityRecord } from "@/lib/account-authorities";
import { resolveExtraPlaceAccountAccess, resolveExtraPlaceAccountOptions } from "@/lib/extra-place-account-options";
import type { LedgerSourceRecord } from "@/lib/combined-ledger-source";

export type ExtraPlaceTypedColumn = "date" | "bookmaker" | "stake";
const sourceKeys: Record<ExtraPlaceTypedColumn, string> = { date: "placed_at", bookmaker: "bookmaker", stake: "each_way_stake" };

/** The native full-record Save remains responsible for all derived values and audit. */
export function extraPlaceTypedCellEligibility(record: Record<string, unknown>, column: string): string | null {
  if (!(column in sourceKeys)) return "This field requires its native editor.";
  if (record.calculation_provenance === "imported_historical") return "Imported historical calculations require native review.";
  if (record.status !== "Prospecting" || record.result !== "Pending") return "Placed, settled and outcome rows require the native review or correction workflow.";
  if (String(record.actual_win_lay_stake ?? "").trim() || String(record.actual_place_lay_stake ?? "").trim()) return "Recorded lay placement requires the native review workflow.";
  return null;
}

export function extraPlaceTypedSourceKey(column: ExtraPlaceTypedColumn): string { return sourceKeys[column]; }

export function extraPlaceBookmakerOptions(accounts: AccountAuthorityRecord[], record: Record<string, unknown>): string[] {
  return resolveExtraPlaceAccountOptions({ accounts, currentBookmaker: String(record.bookmaker ?? ""), rows: [] }).bookmakers
    .filter(name => resolveExtraPlaceAccountAccess(accounts, name)?.allowsPlanning);
}

export async function commitOwnedExtraPlaceTyped({ profileId, recordId, column, expected, value, bookmakerOptions }: {
  profileId: string; recordId: string; column: ExtraPlaceTypedColumn; expected: string; value: string; bookmakerOptions?: string[];
}): Promise<LedgerSourceRecord> {
  const key = sourceKeys[column];
  if (column === "date" && value && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Enter a valid local date and time.");
  if (column === "stake" && value && !/^\d+(?:\.\d+)?$/.test(value)) throw new Error("Enter a valid non-negative stake.");
  if (column === "bookmaker" && (!bookmakerOptions?.includes(value) || !value)) throw new Error("Choose an authorised Profile bookmaker account.");
  const endpoint = `${apiBaseUrl}/profiles/${encodeURIComponent(profileId)}/each-way-extra-places/${encodeURIComponent(recordId)}`;
  const response = await fetch(endpoint, { cache: "no-store", credentials: "include" });
  if (!response.ok) throw new Error(formatApiErrorBody(await response.text(), "The Extra Place record could not be reloaded."));
  const current = await response.json() as LedgerSourceRecord;
  if (current.profile_id !== profileId || current.each_way_extra_place_id !== recordId) throw new Error("Source identity changed; reload before editing.");
  const restriction = extraPlaceTypedCellEligibility(current, column);
  if (restriction) throw new Error(restriction);
  if (column === "bookmaker") {
    const accounts = await fetch(`${apiBaseUrl}/profiles/${encodeURIComponent(profileId)}/accounts`, { cache: "no-store", credentials: "include" });
    if (!accounts.ok) throw new Error("Authorised bookmaker options could not be rechecked.");
    const authorised = extraPlaceBookmakerOptions(await accounts.json() as AccountAuthorityRecord[], current);
    if (!authorised.includes(value)) throw new Error("This bookmaker is no longer available for this Profile.");
  }
  const actual = String(current[key] ?? "");
  if (actual !== expected) throw new Error("This field changed elsewhere. Reload and review its current value.");
  if (actual === value) return current;
  const patch: Record<string, unknown> = { [key]: value };
  if (column === "bookmaker") patch.bookmaker_account = value;
  const saved = await fetch(endpoint, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...current, ...patch }) });
  if (!saved.ok) throw new Error(formatApiErrorBody(await saved.text(), "The field was not saved."));
  const confirmed = await saved.json() as LedgerSourceRecord;
  if (confirmed.profile_id !== profileId || confirmed.each_way_extra_place_id !== recordId || String(confirmed[key] ?? "") !== value || column === "bookmaker" && confirmed.bookmaker_account !== value) throw new Error("The save response did not confirm the field. Reload before retrying.");
  return confirmed;
}
