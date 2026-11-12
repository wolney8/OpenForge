import { apiBaseUrl } from "@/lib/api";
import { formatApiErrorBody } from "@/lib/api-error";
import type { LedgerSourceRecord } from "@/lib/combined-ledger-source";
import type { CombinedLedgerModule } from "@/lib/profile-scope";
import { canCasinoInlineScalarEdit } from "@/components/casino-offer-workflow-shell";
import { getFreeBetInputErrors } from "@/lib/free-bet-input";
import { normalizeAccountAccessChannels } from "@/lib/account-access-channels";
import { fromDateTimeLocalValue } from "@/lib/date-format";

type ScalarField = { key: string; label: string; maxLength: number; required?: boolean };

/** Existing native scalar allowlist. Financial, status and correction fields are absent. */
const fields: Partial<Record<CombinedLedgerModule, Record<string, ScalarField>>> = {
  "sportsbook-bets": {
    event_name: { key: "event_name", label: "Event name", maxLength: 200, required: true },
    offer_name: { key: "offer_name", label: "Campaign Tag", maxLength: 200 },
  },
  "free-bets": {
    event_name: { key: "event_name", label: "Event name", maxLength: 200 },
    offer_name: { key: "offer_name", label: "Campaign Tag", maxLength: 200 },
    expiry_datetime: { key: "expiry_datetime", label: "Expiry", maxLength: 60 },
  },
  "casino-offers": {
    offer_name: { key: "offer_name", label: "Offer name", maxLength: 400, required: true },
    game: { key: "game", label: "Game", maxLength: 200 },
    expiry_datetime: { key: "expiry_datetime", label: "Expiry", maxLength: 60 },
  },
  "each-way-extra-places": {
    runner: { key: "runner", label: "Runner", maxLength: 240 },
    race: { key: "race", label: "Race", maxLength: 240 },
  },
  "cash-adjustments": {
    description: { key: "description", label: "Description", maxLength: 2000 },
  },
};

const recordKeys: Partial<Record<CombinedLedgerModule, string>> = {
  "sportsbook-bets": "sportsbook_bet_id", "free-bets": "free_bet_id", "casino-offers": "casino_offer_id",
  "each-way-extra-places": "each_way_extra_place_id", "cash-adjustments": "cash_adjustment_id",
};

export function ownedScalarField(module: CombinedLedgerModule, column: string, record: LedgerSourceRecord): ScalarField | null {
  const field = fields[module]?.[column];
  if (!field) return null;
  const status = String(record.status ?? "");
  if (module === "sportsbook-bets" && ["Settled", "Void", "Cancelled", "Free Bet Awarded"].includes(status)) return null;
  if ((module === "free-bets" || module === "casino-offers") && status === "Settled") return null;
  // The native Free Bet Save also validates award, placement and commission
  // dependencies. Keep those lifecycle rows in the populated native editor.
  if (module === "free-bets" && (
    !["Prospecting", "Available", "Not Yet Awarded"].includes(status) ||
    String(record.result ?? "Pending") !== "Pending" ||
    !["offer_type", "event_name", "bookmaker"].every(key => String(record[key] ?? "").trim()) ||
    Object.keys(getFreeBetInputErrors(record)).length > 0
  )) return null;
  // Native Sportsbook inline Save serializes conditional multi-lay state;
  // a one-field full-record PUT cannot attest that linked draft preparation.
  if (module === "sportsbook-bets" && ["Multilay", "Multilay-Underlay"].includes(String(record.match_strategy ?? ""))) return null;
  if (module === "casino-offers" && !canCasinoInlineScalarEdit(record as Parameters<typeof canCasinoInlineScalarEdit>[0])) return null;
  if (module === "cash-adjustments" && (["Management Fee Withdrawal", "Investment Fee Withdrawal"].includes(String(record.adjustment_type ?? "")) || String(record.calculation_state ?? "").toLowerCase() === "resolved")) return null;
  return field;
}

/** The same Account row gate used by the native Access Channels cell editor. */
export function ownedAccessChannelsEditable(record: LedgerSourceRecord): boolean {
  return Boolean(record.catalogue_id) && record.type !== "Exchange" && record.signup_offer_status !== "Yes";
}

/**
 * A bounded Account Access Channels edit through the existing Profile-owned
 * Account PUT. Balance fields are omitted so this edit cannot append a balance
 * observation; the API checks the current updated_at inside its transaction.
 */
export async function commitOwnedAccessChannels({ profileId, recordId, expected, values }: {
  profileId: string;
  recordId: string;
  expected: string[];
  values: string[];
}): Promise<LedgerSourceRecord> {
  const desired = normalizeAccountAccessChannels(values);
  const previous = normalizeAccountAccessChannels(expected);
  const endpoint = `${apiBaseUrl}/profiles/${encodeURIComponent(profileId)}/accounts/${encodeURIComponent(recordId)}`;
  const response = await fetch(endpoint, { cache: "no-store", credentials: "include" });
  if (!response.ok) throw new Error(formatApiErrorBody(await response.text(), "The Account could not be reloaded."));
  const current = await response.json() as LedgerSourceRecord;
  if (current.profile_id !== profileId || current.account_id !== recordId) throw new Error("Source identity changed; reload this ledger before editing.");
  if (!ownedAccessChannelsEditable(current)) throw new Error("This Account now requires its native review workflow.");
  const actual = normalizeAccountAccessChannels(Array.isArray(current.access_channels) ? current.access_channels as string[] : []);
  if (JSON.stringify(actual) === JSON.stringify(desired)) return current;
  if (JSON.stringify(actual) !== JSON.stringify(previous)) throw new Error("Access channels changed elsewhere. Reload the Account and review its current value.");
  const payload: Record<string, unknown> = { ...current, access_channels: desired, expected_updated_at: current.updated_at };
  delete payload.current_balance;
  delete payload.pending_withdrawal_amount;
  delete payload.last_balance_update;
  const saved = await fetch(endpoint, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!saved.ok) throw new Error(formatApiErrorBody(await saved.text(), "Access channels were not saved."));
  const confirmed = await saved.json() as LedgerSourceRecord;
  const confirmedValues = normalizeAccountAccessChannels(Array.isArray(confirmed.access_channels) ? confirmed.access_channels as string[] : []);
  if (confirmed.profile_id !== profileId || confirmed.account_id !== recordId || JSON.stringify(confirmedValues) !== JSON.stringify(desired)) throw new Error("The save response did not confirm Access Channels. Reload before retrying.");
  return confirmed;
}

/**
 * Uses the same Profile-owned full-record PUT authority as each native editor.
 * A fresh read checks identity and field staleness before writing one allowlisted
 * scalar. The API retains validation, audit, correction and permission authority.
 */
export async function commitOwnedScalar({ module, profileId, recordId, column, expected, value, operationId }: {
  module: CombinedLedgerModule;
  profileId: string;
  recordId: string;
  column: string;
  expected: string;
  value: string;
  operationId?: string;
}): Promise<LedgerSourceRecord> {
  const identityKey = recordKeys[module];
  if (!identityKey || !fields[module]?.[column]) throw new Error("This field requires the native editor.");
  const field = fields[module][column];
  if (field.required && !value.trim()) throw new Error(`${field.label} is required.`);
  if (value.length > field.maxLength) throw new Error(`${field.label} must be at most ${field.maxLength} characters.`);
  const endpoint = `${apiBaseUrl}/profiles/${encodeURIComponent(profileId)}/${module}/${encodeURIComponent(recordId)}`;
  const response = await fetch(endpoint, { cache: "no-store", credentials: "include" });
  if (!response.ok) throw new Error(formatApiErrorBody(await response.text(), "The source record could not be reloaded."));
  const current = await response.json() as LedgerSourceRecord;
  if (current.profile_id !== profileId || current[identityKey] !== recordId) throw new Error("Source identity changed; reload this ledger before editing.");
  if (!ownedScalarField(module, column, current)) throw new Error("This row now requires its native review or correction workflow.");
  // A previous PUT may have succeeded while its response was lost. The fresh
  // authoritative read confirms that result without producing a second audit write.
  const preparedValue = column === "expiry_datetime" ? fromDateTimeLocalValue(value) : value;
  if (String(current[column] ?? "") === preparedValue) return current;
  if (String(current[column] ?? "") !== expected) throw new Error("This field changed elsewhere. Reload the ledger and review its current value.");
  const saved = await fetch(endpoint, {
    method: "PUT", credentials: "include", headers: {
      "Content-Type": "application/json",
      ...(module === "cash-adjustments" ? { "Idempotency-Key": operationId ?? crypto.randomUUID() } : {}),
    },
    body: JSON.stringify({ ...current, [column]: preparedValue }),
  });
  if (!saved.ok) throw new Error(formatApiErrorBody(await saved.text(), "The field was not saved."));
  const confirmed = await saved.json() as LedgerSourceRecord;
  if (confirmed.profile_id !== profileId || confirmed[identityKey] !== recordId || confirmed[column] !== preparedValue) throw new Error("The save response did not confirm this field. Reload the record before retrying.");
  return confirmed;
}

/** Extra Place displays Runner and Race in one cell; its native PUT validates both together. */
export async function commitOwnedRunnerRace({ profileId, recordId, expectedRunner, expectedRace, runner, race }: {
  profileId: string;
  recordId: string;
  expectedRunner: string;
  expectedRace: string;
  runner: string;
  race: string;
}): Promise<LedgerSourceRecord> {
  if (runner.length > 240 || race.length > 240) throw new Error("Runner and Race must each be at most 240 characters.");
  const endpoint = `${apiBaseUrl}/profiles/${encodeURIComponent(profileId)}/each-way-extra-places/${encodeURIComponent(recordId)}`;
  const response = await fetch(endpoint, { cache: "no-store", credentials: "include" });
  if (!response.ok) throw new Error(formatApiErrorBody(await response.text(), "The Extra Place record could not be reloaded."));
  const current = await response.json() as LedgerSourceRecord;
  if (current.profile_id !== profileId || current.each_way_extra_place_id !== recordId) throw new Error("Source identity changed; reload this ledger before editing.");
  if (!ownedScalarField("each-way-extra-places", "runner", current) || !ownedScalarField("each-way-extra-places", "race", current)) throw new Error("This row now requires its native review or correction workflow.");
  const currentRunner = String(current.runner ?? "");
  const currentRace = String(current.race ?? "");
  if (currentRunner === runner && currentRace === race) return current;
  if (currentRunner !== expectedRunner || currentRace !== expectedRace) throw new Error("Runner or Race changed elsewhere. Reload and review the current values.");
  const saved = await fetch(endpoint, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...current, runner, race }) });
  if (!saved.ok) throw new Error(formatApiErrorBody(await saved.text(), "Runner and Race were not saved."));
  const confirmed = await saved.json() as LedgerSourceRecord;
  if (confirmed.profile_id !== profileId || confirmed.each_way_extra_place_id !== recordId || confirmed.runner !== runner || confirmed.race !== race) throw new Error("The save response did not confirm Runner and Race. Reload before retrying.");
  return confirmed;
}
