import { apiBaseUrl } from "@/lib/api";
import { formatApiErrorBody } from "@/lib/api-error";
import type { LedgerSourceRecord } from "@/lib/combined-ledger-source";
import type { CombinedLedgerModule } from "@/lib/profile-scope";
import { canCasinoInlineScalarEdit } from "@/components/casino-offer-workflow-shell";
import { getFreeBetInputErrors } from "@/lib/free-bet-input";

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
  },
  "casino-offers": {
    offer_name: { key: "offer_name", label: "Offer name", maxLength: 400, required: true },
    game: { key: "game", label: "Game", maxLength: 200 },
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
  if (String(current[column] ?? "") === value) return current;
  if (String(current[column] ?? "") !== expected) throw new Error("This field changed elsewhere. Reload the ledger and review its current value.");
  const saved = await fetch(endpoint, {
    method: "PUT", credentials: "include", headers: {
      "Content-Type": "application/json",
      ...(module === "cash-adjustments" ? { "Idempotency-Key": operationId ?? crypto.randomUUID() } : {}),
    },
    body: JSON.stringify({ ...current, [column]: value }),
  });
  if (!saved.ok) throw new Error(formatApiErrorBody(await saved.text(), "The field was not saved."));
  const confirmed = await saved.json() as LedgerSourceRecord;
  if (confirmed.profile_id !== profileId || confirmed[identityKey] !== recordId || confirmed[column] !== value) throw new Error("The save response did not confirm this field. Reload the record before retrying.");
  return confirmed;
}
