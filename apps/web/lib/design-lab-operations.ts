import { accountAllowsNewSportsbookActivity, type AccountAuthorityRecord } from "./account-authorities";
import { resolveKnownBookmakerCoverage } from "./sportsbook-offer-knowledge";
import { summarizeFeePeriods, type FeePeriodApiRecord } from "./fee-period-summary";
import { initialLabAccounts, type LabAccount, type LabProfileId, type LabScope } from "./design-lab-fixture";
import { labLedgerColumnSpecs, type LabRecord } from "./design-lab-connected-data";
import type { LabReviewTracking } from "./design-lab-field-edit";

// Synthetic, fixed-clock lab fixtures. These do not describe a current external promotion.
export const labClock = "2026-11-01";
export const labReloadDefinition = {
  id: "LAB-OFFER-RELOAD-001",
  name: "Weekly Bookmaker A Reload",
  bookmaker: "Bookmaker A",
  offerType: "Reload",
  offerText: "Synthetic weekly reload: opt in, review terms, then record any qualifying bet separately.",
  schedule: "Review every Friday",
  lastReviewed: "2026-10-30",
  reviewHistory: [{ profile: "Profile A", date: "2026-10-23" }, { profile: "Profile B", date: "2026-10-30" }],
  nextExpectedCheck: "2026-11-06",
  status: "Active",
} as const;

export type LabOfferProfile = LabProfileId | "LAB-PROFILE-C";
export type LabOfferTarget = {
  profileId: LabOfferProfile;
  profileName: string;
  account: string;
  exchange: string;
  commission: string;
  eligibility: "eligible" | "review" | "blocked";
  reason: string;
};

function authority(profileId: LabOfferProfile, status: string, stakeAccess: AccountAuthorityRecord["stake_access"]): AccountAuthorityRecord {
  return { account_id: `LAB-RELOAD-ACCOUNT-${profileId}`, profile_id: profileId,
    account: "Bookmaker A", type: "Bookie", counts_in_cash_total: true, channel: "Online",
    status, lifecycle_status: status, stake_access: stakeAccess,
    catalogue_lifecycle: "ACTIVE", catalogue_eligible_for_new_activity: true,
    current_balance: "", pending_withdrawal_amount: "", last_balance_update: "",
    group_name: "", platform: "", created_at: "2026-10-01", updated_at: "2026-10-30" };
}

function offerAccount(profileId: LabProfileId) {
  const bookmaker = initialLabAccounts.find(row => row.profileId === profileId && row.name === labReloadDefinition.bookmaker);
  const exchange = initialLabAccounts.find(row => row.profileId === profileId && row.type === "Exchange");
  if (!bookmaker || !exchange) throw new Error("Synthetic offer Account fixture is incomplete");
  return { profileId, profileName: profileId === "LAB-PROFILE-A" ? "Profile A" : "Profile B",
    row: authority(profileId, bookmaker.status, bookmaker.status === "Limited" ? "Limited" : "Normal"),
    exchange: exchange.name, commission: exchange.commission ?? "Unavailable" };
}
const offerAccounts = [
  offerAccount("LAB-PROFILE-A"),
  offerAccount("LAB-PROFILE-B"),
  { profileId: "LAB-PROFILE-C" as const, profileName: "Profile C · offer review only", row: authority("LAB-PROFILE-C", "Gubbed", "Blocked"), exchange: "Not configured", commission: "Unavailable" },
];

export const labOfferTargets: LabOfferTarget[] = offerAccounts.map(({ profileId, profileName, row, exchange, commission }) => {
  const coverage = resolveKnownBookmakerCoverage({ knownBookmakers: [labReloadDefinition.bookmaker], accountAuthorities: [row], offerType: labReloadDefinition.offerType })[0];
  const providerEligible = accountAllowsNewSportsbookActivity(row);
  const eligible = coverage.selectable && providerEligible;
  return { profileId, profileName, account: row.account, exchange, commission,
    eligibility: !eligible ? "blocked" : coverage.state === "warning" ? "review" : "eligible",
    reason: !providerEligible && coverage.selectable ? "Provider or Account not eligible for new activity" : coverage.reason };
});

export type LabCopyResult = { profileId: LabOfferProfile; state: "Created" | "Skipped" | "Blocked" | "Failed"; detail: string; recordId?: string };

export function copyLabReload(options: { selected: LabOfferProfile[]; reviewedWarnings: boolean; existing: LabRecord[]; failProfile?: LabOfferProfile }): { created: LabRecord[]; results: LabCopyResult[] } {
  const created: LabRecord[] = [];
  const results = labOfferTargets.map((target): LabCopyResult => {
    const recordId = `LAB-COPY-RELOAD-${target.profileId}`;
    if (target.eligibility === "blocked") return { profileId: target.profileId, state: "Blocked", detail: target.reason };
    if (!options.selected.includes(target.profileId)) return { profileId: target.profileId, state: "Skipped", detail: "Not selected" };
    if (target.eligibility === "review" && !options.reviewedWarnings) return { profileId: target.profileId, state: "Blocked", detail: "Confirm the Profile-specific review condition first" };
    if (options.existing.some(row => row.id === recordId)) return { profileId: target.profileId, state: "Skipped", detail: "Already created; duplicate prevented", recordId };
    if (options.failProfile === target.profileId) return { profileId: target.profileId, state: "Failed", detail: "Simulated save failed; this Profile's Prospecting row was not created." };
    // Only approved shared descriptive fields are copied. Execution and calculation inputs remain unset.
    created.push({ id: recordId, profileId: target.profileId as LabProfileId, section: "sportsbook",
      title: labReloadDefinition.name, subtitle: `${target.account} · ${target.profileName} · copied from ${labReloadDefinition.id}`,
      status: "Prospecting", cells: ["Not entered", target.account, "Event pending", labReloadDefinition.name,
      labReloadDefinition.offerText, "Not selected", "Not confirmed", "Not confirmed", "Planning · unavailable", "Prospecting", "Open"],
      sourceInputs:{bookmaker:target.account,offer_name:labReloadDefinition.name,offer_details:labReloadDefinition.offerText},previewOnly: true });
    return { profileId: target.profileId, state: "Created", detail: "Separate Profile-owned Prospecting row", recordId };
  });
  return { created, results };
}

const feePeriod = (id: string, start: string, end: string, state: string, due: string, outstanding: string, withdrawn: string): FeePeriodApiRecord => ({
  fee_period_id: id, profile_id: "LAB-PROFILE-B", period_start: start, period_end: end, state,
  current_revision: { total_fee_due: due, management_fee_amount: due, investment_fee_amount: "0.00" },
  fee_outstanding_amount: outstanding, fee_withdrawn_amount: withdrawn,
});

// Canonical fee-period summary reads these synthetic reviewed-period amounts.
// It does not derive a fee from gross P&L or claim the estimates are earned.
export const labManagedFeePeriods: FeePeriodApiRecord[] = [
  feePeriod("LAB-FEE-SEP", "2026-09-01", "2026-09-30", "crystallised", "9.00", "4.00", "5.00"),
  feePeriod("LAB-FEE-OCT", "2026-10-01", "2026-10-31", "ready_to_crystallise", "6.00", "0.00", "0.00"),
];
export const labManagedFeeSummary = summarizeFeePeriods(labManagedFeePeriods, new Date("2026-01-01T00:00:00"), new Date("2026-12-31T23:59:59"));

export type LabTodayTask = { id: string; group: "Needs Action" | "Recurring Work" | "Opportunities / Suggestions"; authority: "Confirmed task" | "Configured reminder" | "Advisory suggestion"; title: string; profileId?: LabProfileId; provider: string; due?: string; dateKind?: "Event Date" | "Expiry" | "Expected Check"; sourceId?: string; detail: string; action: string; manual?: boolean; previewOnly?: boolean; requiresImmediateReview?: boolean; reviewCondition?: boolean; sourceType?: "Sportsbook" | "Free Bet" | "Casino" };

/** One source-owned work item per unresolved review condition; no deadline is inferred. */
export function buildLabReviewTasks(records: LabRecord[], tracking: Record<string, LabReviewTracking>, scope: LabScope): LabTodayTask[] {
  return records.flatMap((record): LabTodayTask[] => {
    if (scope !== "all" && record.profileId !== scope) return [];
    const causes = tracking[record.id]?.causes ?? {};
    const fields = Object.keys(causes);
    if (!fields.length) return [];
    const specs = labLedgerColumnSpecs(record.section);
    const label = (field: string) => specs.find(spec => spec.id === field)?.label ?? field.replaceAll("_", " ");
    const sourceType = record.section === "sportsbook" ? "Sportsbook" : record.section === "freeBets" ? "Free Bet" : record.section === "casino" ? "Casino" : undefined;
    return [{id:`review:${record.id}:dependencies`, group:"Needs Action", authority:"Confirmed task", title:`Review ${sourceType ?? record.section} Calculation — ${record.id}`,
      profileId:record.profileId, provider:record.cells[record.section === "freeBets" || record.section === "casino" ? 2 : 1] ?? record.title,
      sourceId:record.id, sourceType, reviewCondition:true, action:"Open Review",
      detail:`Changed: ${fields.map(label).join(", ")}. Review: ${[...new Set(Object.values(causes).flat())].map(label).join(", ")}. No financial result is inferred.`}];
  });
}

export type LabTaskUrgency = "Past Recorded Date" | "Immediate Review" | "Date Today" | "Upcoming" | "No Recorded Date";
const urgencyOrder: LabTaskUrgency[] = ["Past Recorded Date", "Immediate Review", "Date Today", "Upcoming", "No Recorded Date"];
export function labTaskUrgency(task: LabTodayTask): LabTaskUrgency {
  if (task.requiresImmediateReview) return "Immediate Review";
  if (!task.due || !/^\d{4}-\d{2}-\d{2}$/.test(task.due)) return "No Recorded Date";
  if (task.due < labClock) return "Past Recorded Date";
  if (task.due === labClock) return "Date Today";
  return "Upcoming";
}
/** Urgency belongs to the recorded source, not a user's work annotation. */
export function labTaskNeedsUrgentReview(task: LabTodayTask): boolean {
  return task.group === "Needs Action" && (task.requiresImmediateReview === true || Boolean(task.due) &&
    (task.dateKind === "Event Date" ? task.due! < labClock : task.dateKind === "Expiry" && task.due! <= labClock));
}
export function summarizeLabToday(tasks: LabTodayTask[], states: Record<string,string>) {
  const active = tasks.filter(task => states[task.id] !== "Done");
  const sourceNeedsAttention = (task: LabTodayTask) => task.group === "Needs Action" &&
    (!task.due || task.due <= labClock || task.requiresImmediateReview === true);
  return {
    needsAttention: active.filter(sourceNeedsAttention).length,
    routineChecksDue: active.filter(task => task.group === "Recurring Work" && Boolean(task.due) && task.due! <= labClock).length,
    upcoming: active.filter(task => (task.group === "Recurring Work" && Boolean(task.due) && task.due! > labClock) || (task.group === "Needs Action" && Boolean(task.due) && task.due! > labClock && !sourceNeedsAttention(task))).length,
  };
}
export function labTaskDateLabel(task: LabTodayTask): string {
  if (!task.due) return "No recorded date";
  const date = new Date(`${task.due}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" }).format(date);
  if (task.dateKind === "Event Date") return task.due < labClock ? `Event passed ${day}` : `Event ${day}`;
  if (task.dateKind === "Expiry") return `Expires ${day}`;
  return `Expected check ${day}`;
}
export function labTaskSourceType(task: LabTodayTask): "Sportsbook" | "Free Bet" | "Casino" | "Account" | "Routine" | "Suggestion" {
  if (task.sourceType) return task.sourceType;
  if (task.group === "Recurring Work") return "Routine";
  if (task.group === "Opportunities / Suggestions") return "Suggestion";
  if (task.sourceId?.startsWith("LAB-SB")) return "Sportsbook";
  if (task.sourceId?.startsWith("LAB-FB")) return "Free Bet";
  return "Account";
}
export function sortLabTodayTasks(tasks: LabTodayTask[], order: "Priority" | "Date" | "Title" = "Priority"): LabTodayTask[] {
  return tasks.map((task, index) => ({ task, index })).sort((a, b) => {
    const comparison = order === "Title" ? a.task.title.localeCompare(b.task.title)
      : order === "Date" ? (a.task.due ?? "9999").localeCompare(b.task.due ?? "9999")
      : urgencyOrder.indexOf(labTaskUrgency(a.task)) - urgencyOrder.indexOf(labTaskUrgency(b.task)) || (a.task.due ?? "9999").localeCompare(b.task.due ?? "9999");
    return comparison || a.index - b.index;
  }).map(item => item.task);
}

export function buildLabTodayTasks(records: LabRecord[], accounts: LabAccount[], scope: LabScope): LabTodayTask[] {
  const visible = (profileId: LabProfileId) => scope === "all" || scope === profileId;
  const tasks: LabTodayTask[] = [];
  for (const record of records.filter(row => visible(row.profileId))) {
    if (record.section === "sportsbook" && record.status === "Placed") {
      const partial = record.cells[6] === "Partially matched";
      const overdue = Boolean(record.dueDate && record.dueDate < labClock);
      tasks.push({ id: `task:${record.id}`, group: "Needs Action", authority: "Confirmed task",
        title: partial ? "Review Partial Lay" : overdue ? "Review Overdue Unsettled Bet" : "Review Placed Bet for Settlement",
        profileId: record.profileId, provider: record.cells[1], due: record.dueDate, dateKind: "Event Date", requiresImmediateReview: partial,
        sourceId: record.id, detail: partial ? "Matched stake differs from requested stake; exposure remains unresolved." : overdue ? "Recorded event date has passed; result remains open." : "Placed source record remains open.", action: "Open Bet" });
    }
    if (record.section === "freeBets" && record.status === "Available" && record.expiresAt) {
      const days = (Date.parse(`${record.expiresAt}T00:00:00Z`) - Date.parse(`${labClock}T00:00:00Z`)) / 86400000;
      if (days >= 0 && days <= 3) tasks.push({ id: `task:${record.id}`, group: "Needs Action", authority: "Confirmed task",
        title: "Review Expiring Free Bet", profileId: record.profileId, provider: record.cells[2], due: record.expiresAt, dateKind: "Expiry",
        sourceId: record.id, detail: "Recorded expiry is within the configured three-day review window.", action: "Open Free Bet" });
    }
  }
  for (const account of accounts.filter(row => visible(row.profileId) && !row.currentBalance.trim())) {
    tasks.push({ id: `task:${account.id}`, group: "Needs Action", authority: "Confirmed task", title: "Confirm Account Balance",
      profileId: account.profileId, provider: account.name, sourceId: account.id, detail: "Current balance is unknown; no zero is inferred.", action: "Review Account" });
  }
  const recurring: LabTodayTask[] = [
    { id: "reload", group: "Recurring Work", authority: "Configured reminder", title: "Review Weekly Reload", provider: "Bookmaker A", due: labReloadDefinition.nextExpectedCheck, dateKind: "Expected Check", detail: "Expected Friday check; current promotion availability unverified.", action: "Review Offer", manual: true },
    { id: "casino-daily-a", group: "Recurring Work", authority: "Configured reminder", title: "Check Daily Free Spins", profileId: "LAB-PROFILE-A", provider: "Bookmaker C", due: labClock, dateKind: "Expected Check", detail: "Routine check only; no current offer claimed.", action: "Mark Check Done", manual: true },
    { id: "casino-daily-b", group: "Recurring Work", authority: "Configured reminder", title: "Check Daily Free Spins", profileId: "LAB-PROFILE-B", provider: "Bookmaker C", due: labClock, dateKind: "Expected Check", detail: "Separate Profile check; no current offer claimed.", action: "Mark Check Done", manual: true },
    { id: "scratch-friday", group: "Recurring Work", authority: "Configured reminder", title: "Friday Scratch-Card Check", profileId: "LAB-PROFILE-B", provider: "Bookmaker C", due: "2026-11-06", dateKind: "Expected Check", detail: "Expected check; availability unverified.", action: "Mark Check Done", manual: true },
    { id: "account-maintenance", group: "Recurring Work", authority: "Configured reminder", title: "Review Account Access", provider: "All Profiles", detail: "Scheduled maintenance review; does not change Account status.", action: "Mark Check Done", manual: true },
    { id: "signup", group: "Opportunities / Suggestions", authority: "Advisory suggestion", title: "Inspect New Bookmaker Signup", provider: "Unverified provider", detail: "Candidate only; no recorded source or current offer proof in this lab.", action: "Preview Only", previewOnly: true },
    { id: "price-boost", group: "Opportunities / Suggestions", authority: "Advisory suggestion", title: "Check Recurring Price Boost", provider: "Bookmaker A", detail: "Representative suggestion; no recorded price-boost history or current offer proof.", action: "Preview Only", previewOnly: true },
    { id: "advisory", group: "Opportunities / Suggestions", authority: "Advisory suggestion", title: "Check Historical Reload Pattern", provider: "Bookmaker A", detail: "Synthetic history: Profiles A and B reviewed previous reloads. Confirm this week's terms yourself.", action: "Inspect History" },
  ];
  return [...tasks, ...recurring.filter(task => !task.profileId || visible(task.profileId))];
}
