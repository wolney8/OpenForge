import { labLedgerColumnIds, labLedgerColumnSpecs, type LabLedgerKey, type LabRecord } from "./design-lab-connected-data";
import { accountChannelOptions, accountStatusOptions, cashAdjustmentDirectionOptions, cashAdjustmentTypeOptions, casinoOfferResultOptions, casinoOfferStatusOptions, casinoOfferTypeOptions, fixtureTypeOptions, freeBetRetentionModeOptions, freeBetStatusOptions, getAllowedBetTypesForOfferType, getOfferTypeOptions, sportsbookStatusOptions, sportsbookStrategyOptions } from "./workbook-options";

export type LabFieldChange = { field: string; value: string };
export type LabEditOutcome = "UNCHANGED" | "APPLIED" | "VALIDATION_FAILED" | "REVIEW_REQUIRED" | "GOVERNED_CORRECTION_REQUIRED" | "UNAVAILABLE";
export type LabEditResult = { outcome: LabEditOutcome; message?: string; changes?: LabFieldChange[]; reviewFields?: string[] };
export type LabFieldEditCommand = {
  record: LabRecord;
  changes: LabFieldChange[];
  originals: Record<string, string>;
  intent: "inline" | "workbench";
  eligibleAccounts?: string[];
  eligibleAccountsByField?: Partial<Record<"bookmaker" | "exchange" | "linked_account", string[]>>;
  correctionReason?: string;
};

const decimal = /^\d+(?:\.\d{1,2})?$/;
const odds = /^\d+(?:\.\d{1,3})?$/;
const controlled: Partial<Record<LabLedgerKey, Record<string, readonly string[]>>> = {
  accounts: { status: accountStatusOptions, channel: accountChannelOptions },
  sportsbook: { match_strategy: sportsbookStrategyOptions, status: sportsbookStatusOptions },
  freeBets: { match_strategy: freeBetRetentionModeOptions, status: freeBetStatusOptions },
  casino: { offer_type: casinoOfferTypeOptions, status: casinoOfferStatusOptions, result: casinoOfferResultOptions },
  extraPlace: { terms: ["1/4", "1/5", "1/6"] },
  cash: { direction: cashAdjustmentDirectionOptions, adjustment_type: cashAdjustmentTypeOptions, affects_investment: ["Yes", "No"], affects_cash_snapshot: ["Yes", "No"] },
};

export type LabCellControl = "text" | "date" | "datetime-local" | "money" | "odds" | "boolean" | "select" | "account" | "lifecycle" | "read-only";
const gridControls: Record<LabLedgerKey, Record<string, LabCellControl>> = {
  accounts: {account_id:"read-only",account:"read-only",type:"read-only",status:"lifecycle",counts_in_cash_total:"read-only",current_balance:"read-only",pending_withdrawal_amount:"read-only",last_balance_update:"read-only",channel:"select",group_name:"text",platform:"text",actions:"read-only"},
  sportsbook: {date_settled:"date",bookmaker:"account",event_name:"text",offer_name:"text",offer_details:"text",match_strategy:"select",lay_status:"read-only",back_bet_status:"read-only",displayed_value:"read-only",status:"lifecycle",actions:"read-only"},
  freeBets: {date_settled:"date",expiry_datetime:"date",bookmaker:"account",offer_name:"text",event_name:"text",offer_details:"text",match_strategy:"select",lay_status:"read-only",back_bet_status:"read-only",displayed_value:"read-only",status:"lifecycle",actions:"read-only"},
  casino: {date_settling:"date",expiry_datetime:"date",bookmaker:"account",offer_name:"text",game:"text",offer_type:"select",status:"lifecycle",result:"lifecycle",displayed_value:"read-only",actions:"read-only"},
  extraPlace: {date:"date",runner:"text",bookmaker:"account",stake:"money",backOdds:"odds",terms:"select",placeOdds:"read-only",winLayOdds:"odds",winLayStake:"money",winLiability:"read-only",placeLayOdds:"odds",placeLayStake:"money",placeLiability:"read-only",rating:"read-only",impliedOdds:"read-only",qualLoss:"read-only",epProfit:"read-only",actions:"read-only"},
  cash: {cash_adjustment_id:"read-only",adjustment_date:"date",direction:"select",adjustment_type:"select",amount:"money",signed_amount:"read-only",affects_investment:"select",affects_cash_snapshot:"select",linked_account:"account",description:"text",week_label:"read-only",calculation_state:"read-only",actions:"read-only"},
};
export function labCellControl(ledger: LabLedgerKey, field: string, sourceValue = ""): LabCellControl {
  const control = gridControls[ledger][field];
  if (!control) return "read-only";
  return control === "date" && sourceValue.includes("T") ? "datetime-local" : control;
}

// This describes presentation dependencies only. No new financial calculation is performed.
const dependencies: Partial<Record<LabLedgerKey, Record<string, readonly string[]>>> = {
  sportsbook: {
    bookmaker: ["back_bet_status", "displayed_value"], exchange: ["lay_status", "displayed_value"],
    offer_type: ["bet_type", "displayed_value"], bet_type: ["displayed_value"],
    match_strategy: ["lay_status", "displayed_value"], back_stake: ["back_bet_status", "displayed_value"],
    back_odds: ["back_bet_status", "displayed_value"], lay_odds: ["lay_status", "displayed_value"],
    requested_lay_stake: ["lay_status", "displayed_value"], matched_lay_stake: ["lay_status", "displayed_value"],
    commission: ["lay_status", "displayed_value"], status: ["displayed_value"],
  },
  freeBets: { match_strategy: ["displayed_value"], expiry_datetime: ["status"], bookmaker: ["displayed_value"] },
  casino: { offer_type: ["status", "result", "displayed_value"] },
  extraPlace: { stake: ["qualLoss", "epProfit"], backOdds: ["qualLoss", "epProfit"], terms: ["qualLoss", "epProfit"], winLayOdds: ["qualLoss", "epProfit"], winLayStake: ["qualLoss", "epProfit"], placeLayOdds: ["qualLoss", "epProfit"], placeLayStake: ["qualLoss", "epProfit"] },
  cash: { direction: ["signed_amount"], amount: ["signed_amount"], adjustment_type: ["signed_amount", "calculation_state"] },
};

export function labDependentReviewFields(ledger: LabLedgerKey, field: string): string[] {
  return [...(dependencies[ledger]?.[field] ?? [])];
}

export type LabReviewTracking = { base: Record<string,string>; causes: Record<string,string[]> };
export function nextLabReviewTracking(previous: LabReviewTracking | undefined, ledger: LabLedgerKey, changes: LabFieldChange[], originals: Record<string,string>): LabReviewTracking {
  const base = {...previous?.base}, causes = {...previous?.causes};
  for (const change of changes) {
    if (!(change.field in base)) base[change.field] = originals[change.field] ?? "";
    const fields = labDependentReviewFields(ledger, change.field);
    if (change.value === base[change.field] || !fields.length) delete causes[change.field];
    else causes[change.field] = fields;
  }
  return {base,causes};
}

export function labCellChoices(ledger: LabLedgerKey, field: string, eligibleAccounts: string[] = [], current = "", offerType = ""): string[] {
  const accountField = field === "bookmaker" || field === "exchange" || field === "linked_account";
  const options = accountField
    ? eligibleAccounts : ledger === "sportsbook" && field === "offer_type" ? getOfferTypeOptions(current)
      : ledger === "sportsbook" && field === "bet_type" ? getAllowedBetTypesForOfferType(offerType,current)
      : ledger === "sportsbook" && field === "fixture_type" ? fixtureTypeOptions
      : controlled[ledger]?.[field] ?? [];
  // A recorded historical Account remains visible, even if no longer eligible for new activity.
  return (accountField || options.length > 0) && current && !options.includes(current) ? [current, ...options] : [...options];
}

export function validLabDateInput(value: string, requireTime = false): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value);
  if (!match || (requireTime && match[4] === undefined)) return false;
  const [year, month, day] = match.slice(1, 4).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    && (match[4] === undefined || (Number(match[4]) < 24 && Number(match[5]) < 60));
}

export function displayLabLocalDate(value: string): string {
  if (!validLabDateInput(value)) return value;
  const [date,time] = value.split("T");
  const [year,month,day] = date.split("-").map(Number);
  const monthName = new Intl.DateTimeFormat("en-GB", {month:"short",timeZone:"UTC"}).format(new Date(Date.UTC(year,month-1,day)));
  return `${day} ${monthName} ${year}${time ? ` · ${time}` : ""}`;
}

export function evaluateLabFieldEdit(command: LabFieldEditCommand): LabEditResult {
  const { record, originals } = command;
  const specs = labLedgerColumnSpecs(record.section);
  const planning = ["Prospecting", "Draft"].includes(record.status);
  const changed = command.changes.filter(change => change.value !== (originals[change.field] ?? ""));
  if (!changed.length) return { outcome: "UNCHANGED" };
  const review = new Set<string>();
  for (const change of changed) {
    const spec = specs.find(item => item.id === change.field);
    const authority = spec?.edit ?? (record.section === "sportsbook" && ["offer_type", "bet_type", "fixture_type", "exchange", "back_stake", "back_odds", "lay_odds", "requested_lay_stake", "matched_lay_stake", "commission"].includes(change.field) ? "financial-input" : null);
    if (!authority) return { outcome: "UNAVAILABLE", message: `${change.field} has no reviewed editing authority in this lab.` };
    if (authority === "immutable" || authority === "derived" || authority === "actions" || authority === "balance-observation") return { outcome: "UNAVAILABLE", message: `${spec?.label ?? change.field} is protected. Open its source workflow.` };
    if (authority === "governed" || change.field === "status" || change.field === "result") return { outcome: "REVIEW_REQUIRED", message: `${spec?.label ?? change.field} needs the governed lifecycle review.` };
    if (change.value.length > 5000) return { outcome: "VALIDATION_FAILED", message: "The entry is too long." };
    if (authority === "descriptive" && (!change.value.trim() || change.value.length > 180) && change.field !== "offer_details") return { outcome: "VALIDATION_FAILED", message: "Enter 1–180 characters." };
    if (spec?.kind === "date" || change.field === "date_settled") {
      if (change.value && !validLabDateInput(change.value)) return { outcome: "VALIDATION_FAILED", message: "Enter a valid date and time." };
    }
    if (spec?.kind === "odds" || ["back_odds", "lay_odds"].includes(change.field)) {
      if (change.value && (!odds.test(change.value) || Number(change.value) <= 1)) return { outcome: "VALIDATION_FAILED", message: "Enter decimal odds above 1, without commas." };
    } else if (spec?.kind === "money" || ["back_stake", "requested_lay_stake", "matched_lay_stake", "commission"].includes(change.field)) {
      if (change.value && (!decimal.test(change.value) || Number(change.value) < (change.field === "commission" ? 0 : 0.01))) return { outcome: "VALIDATION_FAILED", message: "Enter a valid decimal with at most two places, without commas." };
    }
    if (change.field === "matched_lay_stake") {
      const requested = command.changes.find(item => item.field === "requested_lay_stake")?.value ?? originals.requested_lay_stake;
      if (change.value && (!requested || Number(change.value) > Number(requested))) return { outcome: "VALIDATION_FAILED", message: "Matched Lay Stake cannot exceed requested Lay Stake." };
    }
    const offerType = command.changes.find(item=>item.field==="offer_type")?.value ?? originals.offer_type;
    const eligibleForField = change.field === "bookmaker" || change.field === "exchange" || change.field === "linked_account" ? command.eligibleAccountsByField?.[change.field] ?? command.eligibleAccounts : command.eligibleAccounts;
    const choices = labCellChoices(record.section, change.field, eligibleForField, originals[change.field], offerType);
    if (choices.length && !choices.includes(change.value)) return { outcome: "VALIDATION_FAILED", message: "Choose a permitted value." };
    if (authority !== "descriptive" && !planning) {
      if (command.intent === "workbench" && !command.correctionReason?.trim()) return { outcome: "VALIDATION_FAILED", message: "Enter a reason for this financial correction." };
      return { outcome: "GOVERNED_CORRECTION_REQUIRED", message: "Review the recorded execution or financial correction in the prefilled workbench. This lab has no validated correction fixture." };
    }
    if (["bookmaker", "exchange", "linked_account"].includes(change.field) && !eligibleForField?.includes(change.value) && change.value !== originals[change.field]) return { outcome: "VALIDATION_FAILED", message: "Choose an eligible Account for this Profile." };
    for (const field of labDependentReviewFields(record.section, change.field)) review.add(field);
  }
  return { outcome: "APPLIED", changes: changed, reviewFields: [...review] };
}

export function labFieldDisplayColumn(ledger: LabLedgerKey, field: string): number {
  return labLedgerColumnIds[ledger].indexOf(field);
}
