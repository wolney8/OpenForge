import type {
  CasinoSummaryRecord,
  FreeBetSummaryRecord,
  SportsbookSummaryRecord,
  TrackerSummaryDataset,
} from "./tracker-summary";
import { getSportsbookIssueBadges } from "./sportsbook-table-workflow";

export type OperationalLedger = "sportsbook" | "free-bets" | "casino-offers";
export type OperationalIssueQuery = "all" | "overdue";

export type OperationalActionCounts = {
  sportsbook: number;
  freeBets: number;
  casinoOffers: number;
};

export function sportsbookHasActionIssue(row: SportsbookSummaryRecord): boolean {
  return getSportsbookIssueBadges(row).length > 0;
}

function freeBetExpiryNeedsAction(row: FreeBetSummaryRecord, now: number): boolean {
  const expiryRelevant =
    row.status !== "Settled" &&
    ["Prospecting", "Available", "Not Yet Awarded"].includes(row.status) &&
    row.result === "Pending";
  if (!expiryRelevant) return false;
  if (!row.expiry_datetime.trim()) return true;
  const expiry = Date.parse(row.expiry_datetime);
  return Number.isFinite(expiry) && expiry > now && expiry - now <= 7 * 24 * 60 * 60 * 1000;
}

export function freeBetHasActionIssue(row: FreeBetSummaryRecord, now = Date.now()): boolean {
  return (
    row.status === "Prospecting" ||
    row.status === "Not Yet Awarded" ||
    !row.date_settled.trim() ||
    (row.status === "Placed" && row.result === "Pending" && row.is_overdue) ||
    freeBetExpiryNeedsAction(row, now)
  );
}

export function casinoOfferHasActionIssue(row: CasinoSummaryRecord): boolean {
  return (
    row.status === "Prospecting" ||
    !row.date_settling.trim() ||
    (row.status !== "Prospecting" && row.result === "Pending" && row.is_overdue)
  );
}

export function countOperationalActions(
  dataset: TrackerSummaryDataset,
  now = Date.now()
): OperationalActionCounts {
  return {
    sportsbook: dataset.sportsbookBets.filter(sportsbookHasActionIssue).length,
    freeBets: dataset.freeBets.filter((row) => freeBetHasActionIssue(row, now)).length,
    casinoOffers: dataset.casinoOffers.filter(casinoOfferHasActionIssue).length,
  };
}

export function buildOperationalLedgerHref(
  profileId: string,
  ledger: OperationalLedger,
  issue: OperationalIssueQuery | null = "all"
): string {
  const route = ledger === "sportsbook" ? "sportsbook-bets" : ledger;
  if (issue === null) {
    return `/profiles/${profileId}/tracker/${route}`;
  }
  const issueType = issue === "all" ? "all-issues" : "outcome-needed";
  return `/profiles/${profileId}/tracker/${route}?view=issues&issue=${issueType}&source=profiles`;
}

export function readOperationalIssueQuery(search: string): "all-issues" | "outcome-needed" | null {
  const params = new URLSearchParams(search);
  if (params.get("view") !== "issues") return null;
  const issue = params.get("issue");
  return issue === "outcome-needed" ? "outcome-needed" : "all-issues";
}
