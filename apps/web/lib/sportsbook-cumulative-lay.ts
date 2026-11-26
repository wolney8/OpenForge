import { apiBaseUrl } from "@/lib/api";
import { formatApiErrorBody } from "@/lib/api-error";
import { normalizeMoneyInput } from "@/lib/decimal-input";
import { getPartialLayExecutionSummary } from "@/lib/sportsbook-table-workflow";
import type { LedgerSourceRecord } from "@/lib/combined-ledger-source";
import { sportsbookRevisionHeader } from "@/lib/sportsbook-record-revision";

type Leg = { id: string; exchangeName: string; layOdds: string; matchedStake: string; isFinal: boolean; label?: string };
export type RoutineLay = { requested: number; matched: number; remaining: number; legs: Leg[]; exchange: string; odds: string };

/** Only an unambiguous same-exchange, same-odds pending fill may use the ledger editor. */
export function routineLayEligibility(record: Record<string, unknown>): { value: RoutineLay | null; reason: string } {
  const review = (reason: string) => ({ value: null, reason });
  if (record.status !== "Placed" || record.result !== "Pending") return review("This record requires its protected Placement or correction workflow.");
  if (/^Multilay/.test(String(record.match_strategy ?? "")) || record.match_strategy === "No Lay") return review("Multi-Lay and No Lay use their own Placement review.");
  const request = normalizeMoneyInput(String(record.requested_lay_stake ?? "").trim());
  if (!request || Number(request) <= 0) return review("Requested Lay Stake is not recorded. Record the request in Placement before updating matched fills.");
  const exchange = String(record.exchange_name ?? "").trim();
  const odds = String(record.lay_odds_1 ?? "").trim();
  if (!exchange || !odds || !Number.isFinite(Number(odds)) || Number(odds) <= 1) return review("Exchange or accepted Lay odds are missing. Review the actual execution in Placement.");
  let parsed: unknown;
  try { parsed = JSON.parse(String(record.multi_lay_outcomes_json ?? "[]")); } catch { return review("Recorded Lay legs cannot be read. Review them in Placement."); }
  if (!Array.isArray(parsed) || parsed.length === 0) return review("Recorded Lay leg details are missing. Review the existing matched amount in Placement.");
  const legs = parsed as Leg[];
  if (legs.some(leg => !leg || typeof leg !== "object" || !leg.id || leg.exchangeName !== exchange || leg.layOdds !== odds || !normalizeMoneyInput(String(leg.matchedStake ?? "")) || Number(leg.matchedStake) <= 0)) return review("Lay legs have missing or differing exchange, odds or amounts. Review the allocation in Placement.");
  const summary = getPartialLayExecutionSummary({ explicitTargetLayStake: request, suggestedTargetLayStake: "", legs });
  const savedMatched = normalizeMoneyInput(String(record.lay_matched_stake_1 ?? "").trim());
  if (!savedMatched || Math.round(Number(savedMatched) * 100) !== Math.round(summary.matchedTotal * 100)) return review("Recorded matched total and Lay legs differ. Reconcile them in Placement.");
  if (summary.exceededTarget || summary.hasReachedTarget || summary.remainingToMatch === null) return review("The requested Lay stake is already matched or needs correction review.");
  return { value: { requested: Number(request), matched: summary.matchedTotal, remaining: summary.remainingToMatch, legs, exchange, odds }, reason: "" };
}

/** The existing Profile-owned Sportsbook PUT validates and audits the updated execution. */
export async function commitRoutineCumulativeLay({ profileId, recordId, expectedUpdatedAt, cumulative }: { profileId: string; recordId: string; expectedUpdatedAt: string; cumulative: string }): Promise<LedgerSourceRecord> {
  const target = normalizeMoneyInput(cumulative.trim());
  if (!target) throw new Error("Matched so far needs a complete amount with at most two decimal places.");
  const endpoint = `${apiBaseUrl}/profiles/${encodeURIComponent(profileId)}/sportsbook-bets/${encodeURIComponent(recordId)}`;
  const read = await fetch(endpoint, { cache: "no-store", credentials: "include" });
  if (!read.ok) throw new Error(formatApiErrorBody(await read.text(), "The Sportsbook bet could not be reloaded."));
  const current = await read.json() as LedgerSourceRecord;
  if (current.profile_id !== profileId || current.sportsbook_bet_id !== recordId) throw new Error("Source identity changed. Reload this ledger before editing.");
  if (normalizeMoneyInput(String(current.lay_matched_stake_1 ?? "").trim()) === target) return current;
  if (current.updated_at !== expectedUpdatedAt) throw new Error("This bet changed elsewhere. Reload and review its current Lay evidence before retrying.");
  const eligible = routineLayEligibility(current);
  if (!eligible.value) throw new Error(eligible.reason);
  const evidence = eligible.value;
  const differencePence = Math.round(Number(target) * 100) - Math.round(evidence.matched * 100);
  if (differencePence < 0) throw new Error("A downward matched amount is a correction. Review the existing fills in Placement.");
  if (differencePence === 0) return current;
  if (Math.round(Number(target) * 100) > Math.round(evidence.requested * 100)) throw new Error("Matched so far cannot exceed the recorded Requested Lay Stake. Review Requested Lay Stake in Placement.");
  let nextNumber = evidence.legs.length + 1;
  while (evidence.legs.some(leg => leg.id === `layleg${nextNumber}`)) nextNumber += 1;
  const nextLeg: Leg = { id: `layleg${nextNumber}`, label: `Lay leg ${nextNumber}`, exchangeName: evidence.exchange, layOdds: evidence.odds, matchedStake: (differencePence / 100).toFixed(2), isFinal: Math.round(Number(target) * 100) === Math.round(evidence.requested * 100) };
  const response = await fetch(endpoint, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json", ...sportsbookRevisionHeader(current.updated_at) }, body: JSON.stringify({ ...current, lay_matched_stake_1: target, multi_lay_outcomes_json: JSON.stringify([...evidence.legs, nextLeg]) }) });
  if (!response.ok) throw new Error(formatApiErrorBody(await response.text(), "The Lay fill was not saved."));
  const saved = await response.json() as LedgerSourceRecord;
  if (saved.profile_id !== profileId || saved.sportsbook_bet_id !== recordId || normalizeMoneyInput(String(saved.lay_matched_stake_1 ?? "").trim()) !== target) throw new Error("The save response did not confirm the matched Lay amount. Reload before retrying.");
  return saved;
}
