"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { apiBaseUrl } from "@/lib/api";
import { getAccountNamesByType, type AccountAuthorityRecord } from "@/lib/account-authorities";
import { StatusToast } from "@/components/status-toast";
import { BookmakerIdentity, useBookmakerCatalogue } from "@/components/bookmaker-identity";
import { EditorSection } from "@/components/editor-section";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "@/lib/date-format";
import {
  scrollToElementTopAfterRender,
  usePersistedBoolean,
  usePersistedState,
  useToastDismiss,
  useTrackerRouteReselect,
} from "@/lib/ledger-ui";
import { getLookupValuesByType, type LookupValueRecord } from "@/lib/lookup-values";
import { getSpecialOfferBookmakerSuggestion } from "@/lib/sportsbook-offer-knowledge";
import {
  applyPlacementActionToState,
  filterPlacedPendingRowsInDateRange,
  getFinalizedLaySelectionFromPartialLegs,
  getSportsbookBackBetStatusBadge,
  getSportsbookIssueBadges,
  getPartialLayExecutionSummary,
  getNextSportsbookTableSort,
  getSportsbookRowStateClassName,
  isSortableSportsbookColumn,
  type PlacementAction,
  type SportsbookSortKey,
  type SportsbookTableSort,
  sortSportsbookRows,
} from "@/lib/sportsbook-table-workflow";
import type { TableColumn } from "@/lib/tracker-modules";
import { normalizeBonusRetentionPercentForUi } from "@/lib/tracker-settings";
import { resolveDateRange, type DatePreset } from "@/lib/tracker-summary";
import {
  filterTrackerRows,
  getTrackerPageCount,
  paginateTrackerRows,
} from "@/lib/tracker-table";
import type { TrackerRow } from "@/lib/tracker-types";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { sortIssueBadgesByPriority } from "@/lib/issue-priority";
import {
  dedupeOptions,
  filterCampaignTagOptions,
  fixtureTypeOptions,
  freeBetRetentionModeOptions,
  getAllowedBetTypesForOfferType,
  getDefaultBetTypeForOfferType,
  getOfferTypeDescriptor,
  getOfferTypeOptions,
  normalizeSportsbookBetType,
  sportsbookResultOptions,
  sportsbookStatusOptions,
  sportsbookStrategyOptions,
} from "@/lib/workbook-options";

const visibleSportsbookStrategyOptions = sportsbookStrategyOptions.filter(
  (option) => option !== "Multilay-Underlay"
);

type ResultOption = {
  value: string;
  label: string;
};

type SportsbookRecord = {
  sportsbook_bet_id: string;
  profile_id: string;
  event_name: string;
  offer_text: string;
  bookmaker: string;
  offer_type: string;
  bet_type: string;
  offer_name: string;
  fixture_type: string;
  market: string;
  status: string;
  result: string;
  back_stake: string;
  back_odds: string;
  bonus_trigger: string;
  maximum_bonus: string;
  bonus_retention_rate: string;
  match_strategy: string;
  lay_odds_1: string;
  multi_lay_outcome_1_name: string;
  multi_lay_outcomes_json: string;
  lay_actual: string;
  lay_matched_stake_1: string;
  lay_commission_1: string;
  exchange_name: string;
  date_settled: string;
  user_notes: string;
  manual_override_value: string;
  manual_override_reason: string;
  created_at: string;
  updated_at: string;
  calculation_state: string;
  calculation_notes: string[];
  match_rating: string | null;
  reference_lay_stake_standard: string | null;
  reference_lay_stake_underlay: string | null;
  reference_lay_stake_overlay: string | null;
  calculated_liability_1: string | null;
  scenario_pnl_if_back_wins: string | null;
  scenario_pnl_if_lay_wins: string | null;
  scenario_pnl_if_outcome_2_wins: string | null;
  scenario_pnl_if_outcome_3_wins: string | null;
  projected_current_pnl: string | null;
  actual_net_pnl: string | null;
  final_net_pnl: string | null;
  reporting_value: string | null;
  lay_status: string;
  counts_as_open: boolean;
  is_overdue: boolean;
};

type SportsbookFormState = {
  sportsbook_bet_id?: string;
  event_name: string;
  offer_text: string;
  bookmaker: string;
  offer_type: string;
  bet_type: string;
  offer_name: string;
  fixture_type: string;
  market: string;
  status: string;
  result: string;
  back_stake: string;
  back_odds: string;
  bonus_trigger: string;
  maximum_bonus: string;
  bonus_retention_rate: string;
  match_strategy: string;
  lay_odds_1: string;
  multi_lay_outcome_1_name: string;
  multi_lay_outcomes_json: string;
  lay_actual: string;
  lay_matched_stake_1: string;
  lay_commission_1: string;
  exchange_name: string;
  date_settled: string;
  user_notes: string;
  manual_override_value: string;
  manual_override_reason: string;
};

type ExchangeCommissionRecord = {
  profile_id: string;
  exchange_name: string;
  commission_rate: string;
  created_at: string;
  updated_at: string;
};

type TrackerSettingsRecord = {
  profile_id: string;
  active_date_preset: DatePreset;
  custom_start_date: string;
  custom_end_date: string;
  range_back_days: number;
  range_forward_days: number;
  mug_bet_frequency_days: number;
  free_bet_expiry_alert_window_days: number;
  use_global_date_range_toggle: boolean;
  this_month_mode: string;
  default_free_bet_underlay_factor: string;
  default_free_bet_overlay_factor: string;
  default_bonus_retention_percent: string;
};

type LayStakePreview = {
  suggested: string;
  modeLabel: string;
  note: string;
};

type ScenarioBranchLabel = {
  possible: string;
  settled: string;
};

type ScenarioBranchLabels = {
  backWinLabel: ScenarioBranchLabel;
  layWinLabel: ScenarioBranchLabel;
  outcome2Label: ScenarioBranchLabel | null;
  outcome3Label: ScenarioBranchLabel | null;
};

type OutcomeCardState = "possible" | "hit" | "missed" | "void" | "review";

type MultiLayPlacementState = "pending" | "placed";

type MultiLayOutcomeInput = {
  id: string;
  label: string;
  layOdds: string;
  standardLayStake?: string;
  underlayStake?: string;
  liability?: string;
  placedExchange?: string;
  placedLayOdds?: string;
  placedMatchedStake?: string;
  placementState?: MultiLayPlacementState;
};

type MultiLayPrimaryPlacementState = {
  placedExchange: string;
  placedLayOdds: string;
  placedMatchedStake: string;
  placementState: MultiLayPlacementState;
};

type PartialLayLegInput = {
  id: string;
  exchangeName: string;
  layOdds: string;
  matchedStake: string;
  isFinal: boolean;
};

type MultiLayPlannerLeg = {
  key: string;
  label: string;
  layOdds: number;
  standardLay: string;
  underlayLay: string;
  liability: string;
  layReturnsAfterCommission: string;
};

type MultiLayPlannerSummary = {
  legs: MultiLayPlannerLeg[];
  noSelectionPnl: string;
  landedOutcomePnls: Array<{
    key: string;
    label: string;
    pnl: string;
  }>;
  currentValue: string;
  totalLiability: string;
};

type ParsedMultiLayState = {
  primaryPlacement: MultiLayPrimaryPlacementState;
  extraOutcomes: MultiLayOutcomeInput[];
};

type MultiLayPlacementRow = {
  key: string;
  label: string;
  effectiveStake: string;
  standardStake: string;
  underlayStake: string;
  liability: string;
  placedExchange: string;
  placedLayOdds: string;
  placedMatchedStake: string;
  placementState: MultiLayPlacementState;
};

type MultiLayResultsGridRow = {
  key: string;
  outcomeLabel: string;
  bookmakerValue: string;
  branchValues: Record<string, string>;
  profit: string;
};

type SportsbookCalculationPreview = {
  lay_commission_1: string | null;
  calculation_state: string;
  calculation_notes: string[];
  match_rating: string | null;
  reference_lay_stake_standard: string | null;
  reference_lay_stake_underlay: string | null;
  reference_lay_stake_overlay: string | null;
  calculated_liability_1: string | null;
  scenario_pnl_if_back_wins: string | null;
  scenario_pnl_if_lay_wins: string | null;
  scenario_pnl_if_outcome_2_wins: string | null;
  scenario_pnl_if_outcome_3_wins: string | null;
  projected_current_pnl: string | null;
  actual_net_pnl: string | null;
  final_net_pnl: string | null;
  reporting_value: string | null;
  lay_status: string;
  counts_as_open: boolean;
  is_overdue: boolean;
};

type OutcomeModalState = {
  rowId: string;
  status: string;
  result: string;
  date_settled: string;
};

type FreeBetBridgeModalState = {
  sourceRowId: string;
  bookmaker: string;
  offer_type: string;
  offer_name: string;
  bet_type: string;
  fixture_type: string;
  event_name: string;
  free_bet_value: string;
  expiry_datetime: string;
  retention_mode: string;
  award_timing: "placement" | "settlement";
};

type SportsbookTableMode =
  | "recent"
  | "settling-soon"
  | "pending-placed"
  | "prospecting"
  | "underlays"
  | "overlays";

type SportsbookIssueFilter = "any" | "back-unplaced" | "no-settle-date" | "outcome-needed";

type SportsbookTableFilterState = {
  bookmaker: string;
  offer_type: string;
  fixture_type: string;
  bet_type: string;
  match_strategy: string;
  lay_status: string;
  back_bet_status: string;
  status: string;
  issue_type: SportsbookIssueFilter;
  min_value: string;
  max_value: string;
};

type SportsbookColumnKey =
  | "date_settled"
  | "bookmaker"
  | "event_name"
  | "offer_name"
  | "offer_details"
  | "match_strategy"
  | "lay_status"
  | "back_bet_status"
  | "displayed_value"
  | "status"
  | "actions";

type SportsbookColumnWidths = Partial<Record<SportsbookColumnKey, number>>;

const sportsbookPlaceholderStatuses = new Set(["Prospecting", "Not Placed"]);
const freeBetAwardingOfferTypes = new Set([
  "Bet & Get",
  "Sign up / Welcome",
  "Reload",
  "Refund",
  "Cashback",
]);

function isFreeBetAwardingOffer(offerType: string): boolean {
  return freeBetAwardingOfferTypes.has(offerType);
}
const gbpFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function getDisplayedValue(
  calculation: Pick<
    SportsbookCalculationPreview,
    "projected_current_pnl" | "final_net_pnl" | "reporting_value"
  > | null,
  fallback: Pick<
    SportsbookRecord,
    "projected_current_pnl" | "final_net_pnl" | "reporting_value"
  > | null
): string {
  return (
    calculation?.reporting_value ??
    calculation?.final_net_pnl ??
    calculation?.projected_current_pnl ??
    fallback?.reporting_value ??
    fallback?.final_net_pnl ??
    fallback?.projected_current_pnl ??
    "—"
  );
}

function getDisplayedValueLabel(
  calculation: Pick<
    SportsbookCalculationPreview,
    "projected_current_pnl" | "final_net_pnl" | "reporting_value"
  > | null,
  fallback: Pick<
    SportsbookRecord,
    "projected_current_pnl" | "final_net_pnl" | "reporting_value"
  > | null
): string {
  if (calculation?.final_net_pnl ?? fallback?.final_net_pnl) {
    return "Final value";
  }
  return "Current value";
}

function getCalculationValueSource(
  calculation: Pick<
    SportsbookCalculationPreview,
    "projected_current_pnl" | "final_net_pnl" | "reporting_value"
  > | null,
  fallback: Pick<
    SportsbookRecord,
    "projected_current_pnl" | "final_net_pnl" | "reporting_value"
  > | null
): string {
  if (calculation?.final_net_pnl ?? fallback?.final_net_pnl) {
    return "Settled/final or override-backed reporting value";
  }
  if (calculation?.projected_current_pnl ?? fallback?.projected_current_pnl) {
    return "Cash-first projected/current value for an open row";
  }
  return "Awaiting contract-backed value";
}

const sportsbookTableColumns: TableColumn[] = [
  { key: "date_settled", label: "Settles" },
  { key: "bookmaker", label: "Bookmaker" },
  { key: "event_name", label: "Event" },
  { key: "offer_name", label: "Campaign Tag" },
  { key: "offer_details", label: "Offer Details" },
  { key: "match_strategy", label: "Strategy" },
  { key: "lay_status", label: "Lay Bet" },
  { key: "back_bet_status", label: "Back Bet" },
  { key: "displayed_value", label: "Value" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions" },
];

const defaultVisibleSportsbookColumns = new Set<SportsbookColumnKey>([
  "date_settled",
  "bookmaker",
  "event_name",
  "offer_name",
  "offer_details",
  "match_strategy",
  "lay_status",
  "back_bet_status",
  "displayed_value",
  "status",
  "actions",
]);

const columnHideableKeys = new Set<SportsbookColumnKey>([
  "date_settled",
  "bookmaker",
  "event_name",
  "offer_name",
  "offer_details",
  "match_strategy",
]);

const emptyTableFilters: SportsbookTableFilterState = {
  bookmaker: "",
  offer_type: "",
  fixture_type: "",
  bet_type: "",
  match_strategy: "",
  lay_status: "",
  back_bet_status: "",
  status: "",
  issue_type: "any",
  min_value: "",
  max_value: "",
};

const defaultSportsbookColumnWidths: Record<SportsbookColumnKey, number> = {
  date_settled: 190,
  bookmaker: 130,
  event_name: 220,
  offer_name: 170,
  offer_details: 220,
  match_strategy: 150,
  lay_status: 120,
  back_bet_status: 150,
  displayed_value: 130,
  status: 135,
  actions: 118,
};

const sportsbookTableModes: Array<{ value: SportsbookTableMode; label: string }> = [
  { value: "recent", label: "Recent" },
  { value: "settling-soon", label: "Settling soon" },
  { value: "pending-placed", label: "Placed in range" },
  { value: "prospecting", label: "Prospecting" },
  { value: "underlays", label: "Underlays" },
  { value: "overlays", label: "Overlays" },
];

function getDisplayedValueForRow(
  row: Pick<SportsbookRecord, "projected_current_pnl" | "final_net_pnl" | "reporting_value">
): string {
  return getDisplayedValue(null, row);
}

function getOfferDetailsTokens(row: Pick<SportsbookRecord, "offer_type" | "fixture_type" | "bet_type">): string[] {
  return [row.offer_type, row.fixture_type, row.bet_type]
    .map((value) => getCompactSportsbookLabel(value))
    .filter(Boolean);
}

function getOfferDetailsText(row: Pick<SportsbookRecord, "offer_type" | "fixture_type" | "bet_type">): string {
  const tokens = getOfferDetailsTokens(row);
  return tokens.length > 0 ? tokens.join(" • ") : "—";
}

function parseCurrencyLikeValue(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/[^\d+-.]/g, "");
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrencyValue(value: number): string {
  return gbpFormatter.format(value);
}

function getDisplayedValueLabelForRow(
  row: Pick<SportsbookRecord, "projected_current_pnl" | "final_net_pnl" | "reporting_value">
): string {
  return getDisplayedValueLabel(null, row);
}

function getBetSetupComplete(formState: SportsbookFormState): boolean {
  return Boolean(
    formState.bookmaker.trim() &&
      formState.bet_type.trim() &&
      formState.offer_type.trim() &&
      formState.fixture_type.trim() &&
      formState.event_name.trim()
  );
}

function getMissingBetSetupFields(formState: SportsbookFormState): string[] {
  const requiredFields: Array<{ label: string; value: string }> = [
    { label: "Bookmaker", value: formState.bookmaker },
    { label: "Bet type", value: formState.bet_type },
    { label: "Offer type", value: formState.offer_type },
    { label: "Fixture type", value: formState.fixture_type },
    { label: "Event name", value: formState.event_name },
  ];

  return requiredFields
    .filter((field) => !field.value.trim())
    .map((field) => field.label);
}

function getMissingPlacementFields(
  formState: SportsbookFormState,
  resolvedCommission: string,
  extraOutcomes: MultiLayOutcomeInput[]
): string[] {
  const requiresPlacedPlan =
    formState.status === "Placed" ||
    formState.status === "Settled" ||
    formState.status === "Free Bet Awarded" ||
    formState.result !== "Pending";

  if (!requiresPlacedPlan) {
    return [];
  }

  const missing = getCalculatorMissingFields(formState, resolvedCommission, extraOutcomes);

  if (!formState.date_settled.trim()) {
    missing.push("Settles");
  }

  return missing;
}

function getCalculatorPanelTitle(formState: SportsbookFormState): string {
  const offerType = formState.offer_type.trim() || "Offer type pending";
  const strategy = formState.match_strategy.trim() || "Strategy pending";
  return `${offerType} + ${strategy}`;
}

function getComparableDate(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getIssueFilterMatch(row: SportsbookRecord, issueType: SportsbookIssueFilter): boolean {
  if (issueType === "any") {
    return true;
  }

  const issueLabels = new Set(getSportsbookIssueBadges(row).map((badge) => badge.label));

  if (issueType === "back-unplaced") {
    return issueLabels.has("Back Unplaced");
  }

  if (issueType === "no-settle-date") {
    return issueLabels.has("No Settle Date");
  }

  if (issueType === "outcome-needed") {
    return issueLabels.has("Outcome Needed");
  }

  return true;
}

function ordinalSuffix(day: number): string {
  const remainder = day % 100;
  if (remainder >= 11 && remainder <= 13) {
    return "th";
  }

  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function formatEditorSettlesDate(value: string): string {
  if (!value.trim()) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(date);
  const day = date.getDate();
  const month = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(date);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return `${weekday} ${day}${ordinalSuffix(day)} ${month}, ${time}`;
}

function formatSettlesCountdown(value: string): string {
  if (!value.trim()) {
    return "";
  }

  const settleDate = new Date(value);
  if (Number.isNaN(settleDate.getTime())) {
    return "";
  }

  const diffMs = settleDate.getTime() - Date.now();
  const absDiffMs = Math.abs(diffMs);
  const totalHours = Math.floor(absDiffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  const dayPart = days > 0 ? `${days} day${days === 1 ? "" : "s"}` : "";
  const hourPart = hours > 0 ? `${hours} hour${hours === 1 ? "" : "s"}` : "";
  const compact = [dayPart, hourPart].filter(Boolean).join(" ");

  if (!compact) {
    return diffMs >= 0 ? "in less than 1 hour" : "less than 1 hour ago";
  }

  return diffMs >= 0 ? `in ${compact}` : `${compact} ago`;
}

function formatTableSettlesDate(value: string, range: { start: Date; end: Date }): string {
  if (!value.trim()) {
    return "Unscheduled";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unscheduled";
  }

  const dayName = new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(date);
  const day = date.getDate();
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  const rangeDurationDays = Math.ceil((range.end.getTime() - range.start.getTime()) / 86_400_000);
  const includeFullDate =
    rangeDurationDays > 31 ||
    date.getFullYear() !== range.start.getFullYear() ||
    date.getFullYear() !== range.end.getFullYear();

  if (includeFullDate) {
    const month = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(date);
    return `${dayName} ${day}${ordinalSuffix(day)} ${month} ${date.getFullYear()} ${time}`;
  }

  return `${dayName} ${day}${ordinalSuffix(day)} ${time}`;
}

function getStrategyToneClass(strategy: string): string {
  switch (strategy.trim()) {
    case "Underlay":
      return " table-chip-strategy-underlay";
    case "Overlay":
      return " table-chip-strategy-overlay";
    case "Standard":
      return " table-chip-strategy-standard";
    case "Custom":
      return " table-chip-strategy-custom";
    case "No Lay":
      return " table-chip-strategy-no-lay";
    case "Partial Lay":
      return " table-chip-strategy-partial-lay";
    case "Multilay":
      return " table-chip-strategy-multilay";
    case "Multilay-Underlay":
      return " table-chip-strategy-multilay-underlay";
    default:
      return "";
  }
}

function getCompactSportsbookLabel(value: string): string {
  switch (value.trim()) {
    case "Double Delight / Hat-trick Heaven":
      return "DDHH";
    case "Multilay":
      return "Multi Lay";
    case "Multilay-Underlay":
      return "Multi Lay Underlay";
    case "Back Bet Placed":
      return "Back Placed";
    default:
      return value.trim();
  }
}

function truncateHeaderTitle(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 4)).trimEnd()} ...`;
}

function parseDateValue(value: string): Date | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isDateWithinResolvedRange(value: Date | null, range: { start: Date; end: Date }): boolean {
  if (!value) {
    return false;
  }
  return value >= range.start && value <= range.end;
}

function getSportsbookRangeAnchor(row: Pick<SportsbookRecord, "date_settled" | "created_at">): Date | null {
  return parseDateValue(row.date_settled) ?? parseDateValue(row.created_at);
}

function createBlankForm(defaultBonusRetentionRate = "70"): SportsbookFormState {
  return {
    event_name: "",
    offer_text: "",
    bookmaker: "",
    offer_type: "",
    bet_type: "",
    offer_name: "",
    fixture_type: "",
    market: "",
    status: "Prospecting",
    result: "Pending",
    back_stake: "",
    back_odds: "",
    bonus_trigger: "",
    maximum_bonus: "",
    bonus_retention_rate: defaultBonusRetentionRate,
    match_strategy: "Standard",
    lay_odds_1: "",
    multi_lay_outcome_1_name: "",
    multi_lay_outcomes_json: "[]",
    lay_actual: "",
    lay_matched_stake_1: "",
    lay_commission_1: "",
    exchange_name: "Smarkets",
    date_settled: "",
    user_notes: "",
    manual_override_value: "",
    manual_override_reason: "",
  };
}

function recordToForm(record: SportsbookRecord): SportsbookFormState {
  return {
    sportsbook_bet_id: record.sportsbook_bet_id,
    event_name: record.event_name,
    offer_text: record.offer_text,
    bookmaker: record.bookmaker,
    offer_type: record.offer_type,
    bet_type: normalizeSportsbookBetType(record.bet_type),
    offer_name: record.offer_name,
    fixture_type: record.fixture_type,
    market: record.market,
    status: record.status,
    result: record.result,
    back_stake: record.back_stake,
    back_odds: record.back_odds,
    bonus_trigger: record.bonus_trigger,
    maximum_bonus: record.maximum_bonus,
    bonus_retention_rate: normalizeBonusRetentionPercentForUi(record.bonus_retention_rate),
    match_strategy: record.match_strategy,
    lay_odds_1: record.lay_odds_1,
    multi_lay_outcome_1_name: record.multi_lay_outcome_1_name,
    multi_lay_outcomes_json: record.multi_lay_outcomes_json,
    lay_actual: record.lay_actual,
    lay_matched_stake_1: record.lay_matched_stake_1,
    lay_commission_1: record.lay_commission_1,
    exchange_name: record.exchange_name,
    date_settled: toDateTimeLocalValue(record.date_settled),
    user_notes: record.user_notes,
    manual_override_value: record.manual_override_value,
    manual_override_reason: record.manual_override_reason,
  };
}

function parseNumericInput(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPreviewMoney(value: number): string {
  return value.toFixed(2);
}

function formatSignedPreviewMoney(value: number): string {
  if (value > 0) {
    return `+${formatPreviewMoney(value)}`;
  }
  if (value < 0) {
    return formatPreviewMoney(value);
  }
  return formatPreviewMoney(0);
}

function toInlineUpdatePayload(record: SportsbookRecord, overrides?: Partial<SportsbookFormState>) {
  const formState = {
    ...recordToForm(record),
    ...(overrides ?? {}),
  };

  return {
    event_name: formState.event_name,
    offer_text: formState.offer_text,
    bookmaker: formState.bookmaker,
    offer_type: formState.offer_type,
    bet_type: formState.bet_type,
    offer_name: formState.offer_name,
    fixture_type: formState.fixture_type,
    market: formState.market,
    status: formState.status,
    result: formState.result,
    back_stake: formState.back_stake,
    back_odds: formState.back_odds,
    bonus_trigger: formState.bonus_trigger,
    maximum_bonus: formState.maximum_bonus,
    bonus_retention_rate: formState.bonus_retention_rate,
    match_strategy: formState.match_strategy,
    lay_odds_1: formState.lay_odds_1,
    multi_lay_outcome_1_name: formState.multi_lay_outcome_1_name,
    multi_lay_outcomes_json: formState.multi_lay_outcomes_json,
    lay_actual: formState.lay_actual,
    lay_matched_stake_1: formState.lay_matched_stake_1,
    lay_commission_1: formState.lay_commission_1,
    exchange_name: formState.exchange_name,
    date_settled: fromDateTimeLocalValue(formState.date_settled),
    user_notes: formState.user_notes,
    manual_override_value: formState.manual_override_value,
    manual_override_reason: formState.manual_override_reason,
  };
}

function addMinutesToDateTimeLocalValue(value: string, minutes: number): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return value;
  }

  const nextDate = new Date(timestamp + minutes * 60_000);
  const year = String(nextDate.getFullYear());
  const month = String(nextDate.getMonth() + 1).padStart(2, "0");
  const day = String(nextDate.getDate()).padStart(2, "0");
  const hours = String(nextDate.getHours()).padStart(2, "0");
  const mins = String(nextDate.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${mins}`;
}

function addDaysToDateTimeLocalValue(value: string, days: number): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return "";
  }

  const nextDate = new Date(timestamp + days * 24 * 60 * 60_000);
  const year = String(nextDate.getFullYear());
  const month = String(nextDate.getMonth() + 1).padStart(2, "0");
  const day = String(nextDate.getDate()).padStart(2, "0");
  const hours = String(nextDate.getHours()).padStart(2, "0");
  const mins = String(nextDate.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${mins}`;
}

function createDefaultMultiLayOutcomes(): MultiLayOutcomeInput[] {
  return [
    {
      id: "outcome2",
      label: "",
      layOdds: "",
      standardLayStake: "",
      underlayStake: "",
      liability: "",
      placedExchange: "",
      placedLayOdds: "",
      placedMatchedStake: "",
      placementState: "pending",
    },
  ];
}

function createDefaultMultiLayPrimaryPlacementState(): MultiLayPrimaryPlacementState {
  return {
    placedExchange: "",
    placedLayOdds: "",
    placedMatchedStake: "",
    placementState: "pending",
  };
}

function sanitizeMultiLayOutcomeLabel(value: string): string {
  return value.slice(0, 20);
}

function createPartialLayLegId(index: number): string {
  return `layleg${index}`;
}

function parsePartialLayLegs(serialized: string): PartialLayLegInput[] {
  try {
    const parsed = JSON.parse(serialized);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const legs = parsed
      .map((entry, index) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }

        const record = entry as Record<string, unknown>;
        if (
          !Object.prototype.hasOwnProperty.call(record, "matchedStake") &&
          !Object.prototype.hasOwnProperty.call(record, "exchangeName") &&
          !Object.prototype.hasOwnProperty.call(record, "isFinal")
        ) {
          return null;
        }

        return {
          id:
            typeof record.id === "string" && record.id.trim()
              ? record.id
              : createPartialLayLegId(index + 1),
          exchangeName: typeof record.exchangeName === "string" ? record.exchangeName : "",
          layOdds: typeof record.layOdds === "string" ? record.layOdds : "",
          matchedStake: typeof record.matchedStake === "string" ? record.matchedStake : "",
          isFinal: Boolean(record.isFinal),
        } satisfies PartialLayLegInput;
      })
      .filter((entry): entry is PartialLayLegInput => entry !== null);

    return legs;
  } catch {
    return [];
  }
}

function serializePartialLayLegs(legs: PartialLayLegInput[]): string {
  return JSON.stringify(
    legs.map((leg, index) => ({
      id: leg.id || createPartialLayLegId(index + 1),
      label: `Lay leg ${index + 1}`,
      layOdds: leg.layOdds,
      exchangeName: leg.exchangeName,
      matchedStake: leg.matchedStake,
      isFinal: leg.isFinal,
    }))
  );
}

function createDefaultMultiLayOutcomeLabel(): string {
  return "Outcome 1";
}

function getMultiLayOutcomeLabel(value: string): string {
  return value.trim() || createDefaultMultiLayOutcomeLabel();
}

function createMultiLayOutcomeId(index: number): string {
  return `outcome${index}`;
}

function isMultiLayStrategy(strategy: string): boolean {
  return strategy === "Multilay" || strategy === "Multilay-Underlay";
}

function serializeMultiLayOutcomes(
  formState: SportsbookFormState,
  outcome1Label: string,
  primaryPlacement: MultiLayPrimaryPlacementState,
  outcomes: MultiLayOutcomeInput[],
  plannerSummary?: MultiLayPlannerSummary | null
): string {
  const plannerLegs = new Map(plannerSummary?.legs.map((leg) => [leg.key, leg]) ?? []);
  return JSON.stringify(
    [
      {
        id: "outcome1",
        label: getMultiLayOutcomeLabel(outcome1Label),
        layOdds: formState.lay_odds_1,
        standardLayStake: plannerLegs.get("outcome1")?.standardLay ?? "",
        underlayStake: plannerLegs.get("outcome1")?.underlayLay ?? "",
        liability: plannerLegs.get("outcome1")?.liability ?? "",
        placedExchange: primaryPlacement.placedExchange,
        placedLayOdds: primaryPlacement.placedLayOdds,
        placedMatchedStake: primaryPlacement.placedMatchedStake,
        placementState: primaryPlacement.placementState,
      },
      ...outcomes.map((outcome, index) => ({
        id: outcome.id || createMultiLayOutcomeId(index + 2),
        label: outcome.label,
        layOdds: outcome.layOdds,
        standardLayStake:
          outcome.standardLayStake ?? plannerLegs.get(outcome.id || createMultiLayOutcomeId(index + 2))?.standardLay ?? "",
        underlayStake:
          outcome.underlayStake ?? plannerLegs.get(outcome.id || createMultiLayOutcomeId(index + 2))?.underlayLay ?? "",
        liability:
          outcome.liability ?? plannerLegs.get(outcome.id || createMultiLayOutcomeId(index + 2))?.liability ?? "",
        placedExchange: outcome.placedExchange ?? "",
        placedLayOdds: outcome.placedLayOdds ?? "",
        placedMatchedStake: outcome.placedMatchedStake ?? "",
        placementState: outcome.placementState ?? "pending",
      })),
    ]
  );
}

function parseMultiLayOutcomes(
  serialized: string,
  fallback: {
    outcome1Label: string;
    layOdds1: string;
    exchangeName: string;
    layActual: string;
  }
): ParsedMultiLayState {
  const defaultPrimaryPlacement = createDefaultMultiLayPrimaryPlacementState();
  let primaryPlacement = {
    ...defaultPrimaryPlacement,
    placedExchange: fallback.exchangeName,
    placedLayOdds: fallback.layOdds1,
    placedMatchedStake: fallback.layActual,
    placementState: parseNumericInput(fallback.layActual) !== null ? "placed" : "pending",
  } satisfies MultiLayPrimaryPlacementState;

  try {
    const parsed = JSON.parse(serialized);
    if (!Array.isArray(parsed)) {
      return {
        primaryPlacement,
        extraOutcomes: createDefaultMultiLayOutcomes(),
      };
    }

    const outcomes = parsed.reduce<MultiLayOutcomeInput[]>((accumulator, entry, index) => {
        if (!entry || typeof entry !== "object") {
          return accumulator;
        }

        const record = entry as Partial<MultiLayOutcomeInput>;
        const resolvedId =
          typeof record.id === "string" && record.id.trim()
            ? record.id
            : createMultiLayOutcomeId(index + 1);

        const normalized = {
          id: resolvedId,
          label: typeof record.label === "string" ? record.label : "",
          layOdds: typeof record.layOdds === "string" ? record.layOdds : "",
          standardLayStake:
            typeof record.standardLayStake === "string" ? record.standardLayStake : "",
          underlayStake:
            typeof record.underlayStake === "string" ? record.underlayStake : "",
          liability: typeof record.liability === "string" ? record.liability : "",
          placedExchange:
            typeof record.placedExchange === "string" ? record.placedExchange : "",
          placedLayOdds: typeof record.placedLayOdds === "string" ? record.placedLayOdds : "",
          placedMatchedStake:
            typeof record.placedMatchedStake === "string" ? record.placedMatchedStake : "",
          placementState:
            record.placementState === "placed" || record.placementState === "pending"
              ? record.placementState
              : "pending",
        } satisfies MultiLayOutcomeInput;

        if (resolvedId === "outcome1") {
          primaryPlacement = {
            placedExchange: normalized.placedExchange || fallback.exchangeName,
            placedLayOdds: normalized.placedLayOdds || fallback.layOdds1,
            placedMatchedStake: normalized.placedMatchedStake || fallback.layActual,
            placementState:
              normalized.placementState === "placed" ||
              parseNumericInput(normalized.placedMatchedStake || fallback.layActual) !== null
                ? "placed"
                : "pending",
          };
          return accumulator;
        }

        accumulator.push({
          ...normalized,
        });
        return accumulator;
      }, []);

    return {
      primaryPlacement,
      extraOutcomes: outcomes.length > 0 ? outcomes : createDefaultMultiLayOutcomes(),
    };
  } catch {
    return {
      primaryPlacement,
      extraOutcomes: createDefaultMultiLayOutcomes(),
    };
  }
}

function getComparableDirtyState(
  formState: SportsbookFormState,
  outcome1Label: string,
  extraOutcomes: MultiLayOutcomeInput[],
  partialLayLegs: PartialLayLegInput[],
  primaryPlacement: MultiLayPrimaryPlacementState
): SportsbookFormState {
  if (isMultiLayStrategy(formState.match_strategy)) {
    return {
      ...formState,
      multi_lay_outcome_1_name: getMultiLayOutcomeLabel(outcome1Label),
      multi_lay_outcomes_json: serializeMultiLayOutcomes(
        formState,
        outcome1Label,
        primaryPlacement,
        extraOutcomes
      ),
    };
  }

  return {
    ...formState,
    multi_lay_outcome_1_name: "",
    multi_lay_outcomes_json: partialLayLegs.length > 0 ? serializePartialLayLegs(partialLayLegs) : "[]",
  };
}

async function copyToClipboard(value: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function getSportsbookResultOptions(
  offerType: string,
  strategy: string,
  bonusTrigger: string
): ResultOption[] {
  if (offerType === "Double Delight / Hat-trick Heaven") {
    return [
      { value: "Pending", label: "Pending" },
      {
        value: "Outcome 1 Won",
        label: "Player scored first but no further goals",
      },
      {
        value: "Outcome 2 Won",
        label: "Player scored first and again (2 goals)",
      },
      {
        value: "Outcome 3 Won",
        label: "Player scored first and got a hat-trick",
      },
      {
        value: "Lay Won",
        label: "Player did not score first (lay won)",
      },
      { value: "Void", label: "Void" },
    ];
  }

  if (offerType === "Cashback" || offerType === "Refund") {
    const cashbackOptions: ResultOption[] = ["Pending", "Back Won", "Lay Won", "Void"].map(
      (value) => ({
        value,
        label: getSportsbookResultLabel(value, offerType, strategy, bonusTrigger),
      })
    );
    if (bonusTrigger === "Back Wins") {
      cashbackOptions.splice(2, 0, {
        value: "Back Won + Cashback",
        label: getSportsbookResultLabel(
          "Back Won + Cashback",
          offerType,
          strategy,
          bonusTrigger
        ),
      });
    } else {
      cashbackOptions.splice(3, 0, {
        value: "Lay Won + Cashback",
        label: getSportsbookResultLabel(
          "Lay Won + Cashback",
          offerType,
          strategy,
          bonusTrigger
        ),
      });
    }
    return cashbackOptions;
  }

  if (offerType === "Mug Bet" || strategy === "No Lay") {
    return ["Pending", "Win", "Lose", "Void"].map((value) => ({
      value,
      label: getSportsbookResultLabel(value, offerType, strategy, bonusTrigger),
    }));
  }

  return sportsbookResultOptions.map((option) => ({
    value: option,
    label: getSportsbookResultLabel(option, offerType, strategy, bonusTrigger),
  }));
}

function getSportsbookResultLabel(
  result: string,
  offerType: string,
  strategy: string,
  bonusTrigger: string
): string {
  if (result === "Pending") {
    return "Pending";
  }

  if (result === "Back Won") {
    return "Back won";
  }

  if (result === "Lay Won") {
    return strategy === "No Lay" || offerType === "Mug Bet" ? "Back lost" : "Lay won";
  }

  if (result === "Win") {
    return strategy === "No Lay" || offerType === "Mug Bet" ? "Win" : "Back won";
  }

  if (result === "Lose") {
    return strategy === "No Lay" || offerType === "Mug Bet" ? "Lose" : "Lay won";
  }

  if (result === "Back Won + Cashback") {
    return bonusTrigger === "Back Wins" ? "Back won + cashback/bonus" : "Back won + extra branch";
  }

  if (result === "Lay Won + Cashback") {
    return bonusTrigger === "Lay Wins" ? "Lay won + cashback/bonus" : "Lay won + extra branch";
  }

  if (result === "No Selection Won") {
    return "No selection won";
  }

  if (result === "Outcome 1 Won") {
    return "Outcome 1 won";
  }

  if (result === "Outcome 2 Won") {
    return "Outcome 2 won";
  }

  if (result === "Outcome 3 Won") {
    return "Outcome 3 won";
  }

  if (result === "Mixed") {
    return "Mixed - review required";
  }

  return result;
}

function getScenarioBranchLabels(
  offerType: string,
  strategy: string,
  bonusTrigger: string,
  outcome1Label: string,
  extraOutcomes: MultiLayOutcomeInput[]
): ScenarioBranchLabels {
  if (offerType === "Double Delight / Hat-trick Heaven") {
    return {
      backWinLabel: {
        possible: "Player scores first but no further goals",
        settled: "Player scored first but no further goals",
      },
      layWinLabel: {
        possible: "Player does not score first",
        settled: "Player did not score first",
      },
      outcome2Label: {
        possible: "Player scores first and then scores again",
        settled: "Player scored first and then scored again",
      },
      outcome3Label: {
        possible: "Player scores first and gets a hat-trick",
        settled: "Player scored first and got a hat-trick",
      },
    };
  }

  if (offerType === "Cashback" || offerType === "Refund") {
    const triggerPossible =
      offerType === "Refund" ? "Bonus/refund trigger hits" : "Cashback trigger hits";
    const triggerSettled =
      offerType === "Refund" ? "Bonus/refund triggered" : "Cashback triggered";
    return {
      backWinLabel: {
        possible: "Back wins",
        settled: "Back won",
      },
      layWinLabel: {
        possible: "Lay wins",
        settled: "Lay won",
      },
      outcome2Label: {
        possible: triggerPossible,
        settled: triggerSettled,
      },
      outcome3Label: null,
    };
  }

  if (offerType === "Mug Bet" || strategy === "No Lay") {
    return {
      backWinLabel: {
        possible: "Back wins",
        settled: "Back won",
      },
      layWinLabel: {
        possible: "Back loses",
        settled: "Back lost",
      },
      outcome2Label: null,
      outcome3Label: null,
    };
  }

  if (strategy === "Multilay" || strategy === "Multilay-Underlay") {
    return {
      backWinLabel: {
        possible: outcome1Label.trim() || "Outcome 1 lands",
        settled: outcome1Label.trim() || "Outcome 1 landed",
      },
      layWinLabel: {
        possible: "Back loses",
        settled: "Back lost",
      },
      outcome2Label: {
        possible: extraOutcomes[0]?.label?.trim() || "Outcome 2 lands",
        settled: extraOutcomes[0]?.label?.trim() || "Outcome 2 landed",
      },
      outcome3Label:
        extraOutcomes.length > 1
          ? {
              possible: extraOutcomes[1]?.label?.trim() || "Outcome 3 lands",
              settled: extraOutcomes[1]?.label?.trim() || "Outcome 3 landed",
            }
          : null,
    };
  }

  return {
    backWinLabel: {
      possible: "Back wins",
      settled: "Back won",
    },
    layWinLabel: {
      possible: "Lay wins",
      settled: "Lay won",
    },
    outcome2Label: null,
    outcome3Label: null,
  };
}

function getScenarioBranchText(
  label: ScenarioBranchLabel | null,
  result: string
): string | null {
  if (!label) {
    return null;
  }
  return result === "Pending" ? label.possible : label.settled;
}

function getOutcomeCardState(
  result: string,
  key: "back" | "lay" | "outcome2" | "outcome3"
): OutcomeCardState {
  if (result === "Pending") {
    return "possible";
  }
  if (result === "Void") {
    return "void";
  }
  if (result === "Mixed") {
    return "review";
  }

  const hitKey =
    result === "Back Won" || result === "Win" || result === "Outcome 1 Won"
      ? "back"
      : result === "Lay Won" || result === "Lose" || result === "No Selection Won"
        ? "lay"
        : result === "Back Won + Cashback"
          ? "outcome2"
          : result === "Lay Won + Cashback"
            ? "outcome2"
            : result === "Outcome 2 Won"
              ? "outcome2"
              : result === "Outcome 3 Won"
                ? "outcome3"
                : null;

  if (hitKey === null) {
    return "possible";
  }

  return hitKey === key ? "hit" : "missed";
}

function getOutcomeCardLabel(state: OutcomeCardState): string {
  if (state === "hit") {
    return "Outcome hit";
  }
  if (state === "missed") {
    return "Outcome missed";
  }
  if (state === "void") {
    return "Outcome void";
  }
  if (state === "review") {
    return "Review required";
  }
  return "Possible outcome";
}

function getCalculationStateLabel(state: string | null | undefined): string {
  if (state === "review_required") {
    return "Review required";
  }
  if (state === "incomplete") {
    return "Incomplete";
  }
  if (state === "resolved") {
    return "Resolved";
  }
  return "Draft";
}

function applyOfferTypeDefaults(
  current: SportsbookFormState,
  nextOfferType: string,
  defaultBonusRetentionRate = "70"
): SportsbookFormState {
  const fallbackBetType = getDefaultBetTypeForOfferType(nextOfferType, current.bet_type);
  const previewStrategy =
    nextOfferType === "Mug Bet" || nextOfferType === "None"
      ? "No Lay"
      : current.match_strategy;
  const nextResultOptions = getSportsbookResultOptions(
    nextOfferType,
    previewStrategy,
    current.bonus_trigger
  );
  const nextResultValues = new Set(nextResultOptions.map((option) => option.value));
  const nextState: SportsbookFormState = {
    ...current,
    offer_type: nextOfferType,
    bet_type: fallbackBetType,
    result: nextResultValues.has(current.result) ? current.result : "Pending",
  };

  if (nextOfferType === "Mug Bet" || nextOfferType === "None") {
    return {
      ...nextState,
      match_strategy: "No Lay",
      bet_type: fallbackBetType,
      exchange_name: "",
      lay_odds_1: "",
      lay_actual: "",
      lay_matched_stake_1: "",
    };
  }

  if (!nextState.exchange_name.trim()) {
    nextState.exchange_name = "Smarkets";
  }

  if (nextOfferType === "Double Delight / Hat-trick Heaven") {
    return {
      ...nextState,
      bet_type: "First Goalscorer",
      fixture_type: current.fixture_type || "Football",
      market: current.market || "First Goalscorer",
    };
  }

  if (fallbackBetType === "Bet Builder" && !current.market.trim()) {
    return {
      ...nextState,
      bet_type: fallbackBetType,
      market: "Bet Builder",
    };
  }

  if (fallbackBetType === "Accumulator / Multiple" && !current.market.trim()) {
    return {
      ...nextState,
      bet_type: fallbackBetType,
      market: "Accumulator / Multiple",
    };
  }

  if (nextOfferType === "Cashback" || nextOfferType === "Refund") {
    const bonusTrigger = current.bonus_trigger || "Lay Wins";
    const nextOptions = getSportsbookResultOptions(nextOfferType, current.match_strategy, bonusTrigger);
    const nextValues = new Set(nextOptions.map((option) => option.value));
    return {
      ...nextState,
      bonus_trigger: bonusTrigger,
      bonus_retention_rate: current.bonus_retention_rate || defaultBonusRetentionRate,
      result: nextValues.has(nextState.result) ? nextState.result : "Pending",
    };
  }

  return nextState;
}

function applyStrategyDefaults(
  current: SportsbookFormState,
  nextStrategy: string
): SportsbookFormState {
  const nextResultOptions = getSportsbookResultOptions(
    current.offer_type,
    nextStrategy,
    current.bonus_trigger
  );
  const nextResultValues = new Set(nextResultOptions.map((option) => option.value));

  if (nextStrategy === "No Lay") {
    return {
      ...current,
      match_strategy: nextStrategy,
      result: nextResultValues.has(current.result) ? current.result : "Pending",
      exchange_name: "",
      lay_odds_1: "",
      lay_actual: "",
      lay_matched_stake_1: "",
    };
  }

  return {
    ...current,
    match_strategy: nextStrategy,
    result: nextResultValues.has(current.result) ? current.result : "Pending",
  };
}

function applyResultDefaults(
  current: SportsbookFormState,
  nextResult: string
): SportsbookFormState {
  const nextStatus =
    nextResult === "Pending"
      ? current.status === "Settled" || current.status === "Void"
        ? "Placed"
        : current.status
      : nextResult === "Void"
        ? "Void"
        : "Settled";

  return {
    ...current,
    result: nextResult,
    status: nextStatus,
  };
}

function applyStatusDefaults(
  current: SportsbookFormState,
  nextStatus: string
): SportsbookFormState {
  if (nextStatus === "Prospecting" || nextStatus === "Not Placed" || nextStatus === "Placed") {
    return {
      ...current,
      status: nextStatus,
      result: "Pending",
    };
  }

  if (nextStatus === "Void" || nextStatus === "Cancelled") {
    return {
      ...current,
      status: nextStatus,
      result: "Void",
    };
  }

  return {
    ...current,
    status: nextStatus,
  };
}

function applyOutcomeModalResultDefaults(
  current: OutcomeModalState,
  nextResult: string
): OutcomeModalState {
  const nextStatus =
    nextResult === "Pending"
      ? current.status === "Settled" || current.status === "Void"
        ? "Placed"
        : current.status
      : nextResult === "Void"
        ? "Void"
        : "Settled";

  return {
    ...current,
    result: nextResult,
    status: nextStatus,
  };
}

function applyOutcomeModalStatusDefaults(
  current: OutcomeModalState,
  nextStatus: string
): OutcomeModalState {
  if (nextStatus === "Prospecting" || nextStatus === "Not Placed" || nextStatus === "Placed") {
    return {
      ...current,
      status: nextStatus,
      result: "Pending",
    };
  }

  if (nextStatus === "Void" || nextStatus === "Cancelled") {
    return {
      ...current,
      status: nextStatus,
      result: "Void",
    };
  }

  return {
    ...current,
    status: nextStatus,
  };
}

function applyBetTypeDefaults(
  current: SportsbookFormState,
  nextBetType: string
): SportsbookFormState {
  if (nextBetType === "Bet Builder" && !current.market.trim()) {
    return {
      ...current,
      bet_type: nextBetType,
      market: "Bet Builder",
    };
  }

  if (nextBetType === "Accumulator / Multiple" && !current.market.trim()) {
    return {
      ...current,
      bet_type: nextBetType,
      market: "Accumulator / Multiple",
    };
  }

  if ((nextBetType === "First Goalscorer" || nextBetType === "Correct Score") && !current.market.trim()) {
    return {
      ...current,
      bet_type: nextBetType,
      market: nextBetType,
    };
  }

  return {
    ...current,
    bet_type: nextBetType,
  };
}

function getLayStakePreview(
  formState: SportsbookFormState,
  resolvedCommission: string
): LayStakePreview | null {
  const backStake = parseNumericInput(formState.back_stake);
  const backOdds = parseNumericInput(formState.back_odds);
  const layOdds = parseNumericInput(formState.lay_odds_1);
  const commission = parseNumericInput(resolvedCommission);

  if (formState.match_strategy === "No Lay") {
    return {
      suggested: "0.00",
      modeLabel: "No Lay",
      note: "Workbook parity: no-lay rows use zero lay stake.",
    };
  }

  if (backStake === null || backOdds === null) {
    return null;
  }

  if (formState.match_strategy === "Custom" || formState.match_strategy === "Partial Lay") {
    return {
      suggested: formState.lay_actual.trim() || "—",
      modeLabel: formState.match_strategy,
      note: "Workbook parity: custom and partial-lay rows rely on explicit lay actual values.",
    };
  }

  if (layOdds === null || commission === null) {
    return null;
  }

  let suggested: number | null = null;
  const note = "Workbook parity suggestion from the current strategy and resolved commission.";

  if (formState.match_strategy === "Standard") {
    const denominator = layOdds - commission;
    if (denominator !== 0) {
      suggested = (backStake * backOdds) / denominator;
    }
  } else if (formState.match_strategy === "Underlay") {
    const denominator = layOdds - 1;
    if (denominator !== 0) {
      suggested = (backStake * (backOdds - 1)) / denominator;
    }
  } else if (formState.match_strategy === "Overlay") {
    const denominator = 1 - commission;
    if (denominator !== 0) {
      suggested = backStake / denominator;
    }
  } else if (
    formState.match_strategy === "Multilay" ||
    formState.match_strategy === "Multilay-Underlay"
  ) {
    return {
      suggested: "—",
      modeLabel: formState.match_strategy,
      note: "Workbook multi-lay rows use the branch planner below to calculate each lay leg from the saved outcome names, lay odds, and resolved commission.",
    };
  }

  if (suggested === null || !Number.isFinite(suggested)) {
    return null;
  }

  return {
    suggested: formatPreviewMoney(suggested),
    modeLabel: formState.match_strategy,
    note,
  };
}

function hasPreviewInputsReady(
  formState: SportsbookFormState,
  resolvedCommission: string
): boolean {
  const hasBackInputs =
    parseNumericInput(formState.back_stake) !== null &&
    parseNumericInput(formState.back_odds) !== null;

  if (!hasBackInputs) {
    return false;
  }

  if (formState.match_strategy === "No Lay") {
    return true;
  }

  if (!formState.exchange_name.trim() || !resolvedCommission.trim()) {
    return false;
  }

  if (parseNumericInput(formState.lay_odds_1) === null) {
    return false;
  }

  if (
    (formState.match_strategy === "Custom" || formState.match_strategy === "Partial Lay") &&
    parseNumericInput(formState.lay_actual) === null
  ) {
    return false;
  }

  return true;
}

function getCalculatorMissingFields(
  formState: SportsbookFormState,
  resolvedCommission: string,
  extraOutcomes: MultiLayOutcomeInput[]
): string[] {
  const missing: string[] = [];

  if (parseNumericInput(formState.back_stake) === null) {
    missing.push("Back stake");
  }
  if (parseNumericInput(formState.back_odds) === null) {
    missing.push("Back odds");
  }

  if (formState.match_strategy === "No Lay") {
    return missing;
  }

  if (!formState.exchange_name.trim()) {
    missing.push("Exchange");
  }
  if (!resolvedCommission.trim()) {
    missing.push("Exchange commission in Settings");
  }
  if (parseNumericInput(formState.lay_odds_1) === null) {
    missing.push("Lay odds 1");
  }
  if (
    (formState.match_strategy === "Custom" || formState.match_strategy === "Partial Lay") &&
    parseNumericInput(formState.lay_actual) === null
  ) {
    missing.push("Lay actual");
  }

  if (
    (formState.offer_type === "Cashback" || formState.offer_type === "Refund") &&
    parseNumericInput(formState.maximum_bonus) === null
  ) {
    missing.push("Maximum bonus");
  }

  if (
    formState.offer_type === "Refund" &&
    parseNumericInput(formState.bonus_retention_rate) === null
  ) {
    missing.push("Bonus retention %");
  }

  if (isMultiLayStrategy(formState.match_strategy)) {
    const hasSecondLeg = extraOutcomes.some((outcome) => parseNumericInput(outcome.layOdds) !== null);
    if (!hasSecondLeg) {
      missing.push("Outcome 2 lay odds");
    }
  }

  return missing;
}

function getCalculatorGuidance(
  formState: SportsbookFormState,
  resolvedCommission: string
): string {
  if (
    parseNumericInput(formState.back_stake) === null ||
    parseNumericInput(formState.back_odds) === null
  ) {
    return "Enter back stake and back odds to unlock the workbook-style calculation preview.";
  }

  if (formState.match_strategy === "No Lay") {
    return "No-lay rows resolve from the back-side outcome only. Save the row once the back side is known.";
  }

  if (!formState.exchange_name.trim()) {
    return "Choose the exchange used for this row so the profile commission setting can be applied.";
  }

  if (!resolvedCommission.trim()) {
    return "Add this exchange commission in Settings before relying on contract-backed sportsbook money values.";
  }

  if (parseNumericInput(formState.lay_odds_1) === null) {
    return "Enter the first lay odds to see the workbook-style lay suggestion and current-value preview.";
  }

  if (
    (formState.match_strategy === "Custom" || formState.match_strategy === "Partial Lay") &&
    parseNumericInput(formState.lay_actual) === null
  ) {
    return `Enter lay actual for the ${formState.match_strategy.toLowerCase()} path before the contract-backed preview resolves.`;
  }

  return "Contract-backed sportsbook preview is ready.";
}

function getSportsbookWorkflowRule(
  offerType: string,
  strategy: string,
  bonusTrigger: string
): string | null {
  if (offerType === "Double Delight / Hat-trick Heaven") {
    return "DD/HH rows track four branches: player does not score first, scores first only, scores first and again, or scores first and gets a hat-trick.";
  }

  if (offerType === "Refund") {
    return `Refund rows keep the qualifying loss as the current value and use the ${bonusTrigger === "Back Wins" ? "back-win" : "lay-win"} trigger plus retained bonus percentage for the extra branch.`;
  }

  if (offerType === "Cashback") {
    return `Cashback rows keep the qualifying path first and only use the ${bonusTrigger === "Back Wins" ? "back-win" : "lay-win"} cashback branch when that trigger is actually hit.`;
  }

  if (offerType === "Mug Bet" || strategy === "No Lay") {
    return "No-lay rows behave as pure back-side positions. Exchange fields stay out of scope and current value follows the back-win versus back-lose cash path. Workbook caveat: Mug Bet and None win-path treatment remains flagged for review.";
  }

  if (strategy === "Multilay" || strategy === "Multilay-Underlay") {
    return "Multi-lay rows use named outcome branches. Each extra lay leg needs its own outcome label and lay odds so the current value can stay conservative.";
  }

  return null;
}

function getSettlementReviewRule(
  offerType: string,
  result: string,
  strategy: string
): string | null {
  if (result === "Mixed") {
    return "Mixed settlement is still review-required in this slice. Use Advanced controls only after reconciling the workbook path.";
  }

  if ((offerType === "Mug Bet" || offerType === "None") && strategy === "No Lay") {
    return "No-lay mug and plain rows keep the current workbook caveat. Confirm the win-path against the workbook before treating it as final.";
  }

  return null;
}

function getMatchRatingPillTone(value: number): "low" | "mid" | "good" | "arp" {
  if (value >= 100) {
    return "arp";
  }
  if (value >= 70) {
    return "good";
  }
  if (value >= 40) {
    return "mid";
  }
  return "low";
}

function getMatchRatingInterpretation(value: number) {
  if (value >= 100) {
    return "ARP risk";
  }
  if (value >= 70) {
    return "Good";
  }
  if (value >= 40) {
    return "Review";
  }
  return "Poor";
}

function getMultiLayPlannerSummary(
  formState: SportsbookFormState,
  resolvedCommission: string,
  outcome1Label: string,
  extraOutcomes: MultiLayOutcomeInput[]
): MultiLayPlannerSummary | null {
  if (
    formState.match_strategy !== "Multilay" &&
    formState.match_strategy !== "Multilay-Underlay"
  ) {
    return null;
  }

  const backStake = parseNumericInput(formState.back_stake);
  const backOdds = parseNumericInput(formState.back_odds);
  const layOdds1 = parseNumericInput(formState.lay_odds_1);
  const commission = parseNumericInput(resolvedCommission);

  if (backStake === null || backOdds === null || layOdds1 === null || commission === null) {
    return null;
  }

  const activeOdds = [
    {
      key: "outcome1",
      label: outcome1Label.trim() || "Outcome 1",
      layOdds: layOdds1,
    },
    ...extraOutcomes
      .map((outcome) => ({
        key: outcome.id,
        label: outcome.label.trim() || outcome.id.replace("outcome", "Outcome "),
        layOdds: parseNumericInput(outcome.layOdds),
      }))
      .filter((outcome) => outcome.layOdds !== null)
      .map((outcome) => ({
        key: outcome.key,
        label: outcome.label,
        layOdds: outcome.layOdds as number,
      })),
  ];

  if (activeOdds.length < 2) {
    return null;
  }

  const standardStakes = activeOdds.map((outcome) => {
    const denominator = outcome.layOdds - commission;
    if (denominator === 0) {
      return null;
    }
    return (backStake * backOdds) / denominator;
  });

  const underlayDenominator = activeOdds.reduce((sum, outcome) => {
    const branchDenominator = outcome.layOdds - commission;
    if (branchDenominator === 0) {
      return Number.NaN;
    }
    return sum + (1 - commission) / branchDenominator;
  }, 0);
  const underlayStakes =
    Number.isFinite(underlayDenominator) && underlayDenominator !== 0
      ? activeOdds.map((outcome) => {
          const branchDenominator = outcome.layOdds - commission;
          return (backStake / underlayDenominator) / branchDenominator;
        })
      : activeOdds.map(() => null);

  const effectiveStakes =
    formState.match_strategy === "Multilay" ? standardStakes : underlayStakes;

  if (
    standardStakes.some((stake) => stake === null || !Number.isFinite(stake)) ||
    underlayStakes.some((stake) => stake === null || !Number.isFinite(stake)) ||
    effectiveStakes.some((stake) => stake === null || !Number.isFinite(stake))
  ) {
    return null;
  }

  const legs: MultiLayPlannerLeg[] = activeOdds.map((outcome, index) => {
    const standardStake = Number(standardStakes[index]);
    const underlayStake = Number(underlayStakes[index]);
    const selectedStake = Number(effectiveStakes[index]);
    const liability = selectedStake * (outcome.layOdds - 1);
    const layReturnsAfterCommission = selectedStake * (1 - commission);

    return {
      key: outcome.key,
      label: outcome.label,
      layOdds: outcome.layOdds,
      standardLay: formatPreviewMoney(standardStake),
      underlayLay: formatPreviewMoney(underlayStake),
      liability: formatPreviewMoney(liability),
      layReturnsAfterCommission: formatPreviewMoney(layReturnsAfterCommission),
    };
  });

  const backProfit = backStake * (backOdds - 1);
  const totalReturns = legs.reduce(
    (sum, leg) => sum + (parseNumericInput(leg.layReturnsAfterCommission) ?? 0),
    0
  );
  const landedOutcomePnls = legs.map((leg) => {
    const liability = parseNumericInput(leg.liability) ?? 0;
    const ownReturns = parseNumericInput(leg.layReturnsAfterCommission) ?? 0;
    const basePnl = backProfit - liability + (totalReturns - ownReturns);

    let pnl = basePnl;
    if (formState.offer_type === "Double Delight / Hat-trick Heaven") {
      if (leg.key === "outcome2") {
        pnl = basePnl + backProfit;
      } else if (leg.key === "outcome3") {
        pnl = basePnl + backProfit * 2;
      }
    }

    return {
      key: leg.key,
      label: leg.label,
      pnl: formatPreviewMoney(pnl),
      numericPnl: pnl,
    };
  });
  const noSelectionPnl = -backStake + totalReturns;
  const currentCandidates = [
    noSelectionPnl,
    ...landedOutcomePnls.map((entry) => entry.numericPnl),
  ];

  const totalLiability = legs.reduce((sum, leg) => sum + (parseNumericInput(leg.liability) ?? 0), 0);

  return {
    legs,
    noSelectionPnl: formatPreviewMoney(noSelectionPnl),
    landedOutcomePnls: landedOutcomePnls.map(({ key, label, pnl }) => ({ key, label, pnl })),
    currentValue: formatPreviewMoney(Math.min(...currentCandidates)),
    totalLiability: formatPreviewMoney(totalLiability),
  };
}

function getEffectiveMultiLayStakeForLeg(
  strategy: string,
  leg: Pick<MultiLayPlannerLeg, "standardLay" | "underlayLay">
): string {
  return strategy === "Multilay-Underlay" ? leg.underlayLay : leg.standardLay;
}

function getMultiLayPlacementRows(
  formState: SportsbookFormState,
  primaryPlacement: MultiLayPrimaryPlacementState,
  extraOutcomes: MultiLayOutcomeInput[],
  plannerSummary: MultiLayPlannerSummary | null
): MultiLayPlacementRow[] {
  if (!plannerSummary) {
    return [];
  }

  return plannerSummary.legs.map((leg) => {
    if (leg.key === "outcome1") {
      return {
        key: leg.key,
        label: leg.label,
        effectiveStake: getEffectiveMultiLayStakeForLeg(formState.match_strategy, leg),
        standardStake: leg.standardLay,
        underlayStake: leg.underlayLay,
        liability: leg.liability,
        placedExchange: primaryPlacement.placedExchange || formState.exchange_name,
        placedLayOdds: primaryPlacement.placedLayOdds || formState.lay_odds_1,
        placedMatchedStake: primaryPlacement.placedMatchedStake,
        placementState: primaryPlacement.placementState,
      };
    }

    const extraOutcome = extraOutcomes.find((outcome) => outcome.id === leg.key);
    return {
      key: leg.key,
      label: leg.label,
      effectiveStake: getEffectiveMultiLayStakeForLeg(formState.match_strategy, leg),
      standardStake: leg.standardLay,
      underlayStake: leg.underlayLay,
      liability: leg.liability,
      placedExchange: extraOutcome?.placedExchange || formState.exchange_name,
      placedLayOdds: extraOutcome?.placedLayOdds || extraOutcome?.layOdds || "",
      placedMatchedStake: extraOutcome?.placedMatchedStake || "",
      placementState: extraOutcome?.placementState ?? "pending",
    };
  });
}

function getMultiLayPlacementStatus(rows: MultiLayPlacementRow[]): "Not Laid" | "Part Laid" | "Fully Laid" {
  if (rows.length === 0) {
    return "Not Laid";
  }

  const placedCount = rows.filter(
    (row) => row.placementState === "placed" && parseNumericInput(row.placedMatchedStake) !== null
  ).length;

  if (placedCount === 0) {
    return "Not Laid";
  }

  if (placedCount < rows.length) {
    return "Part Laid";
  }

  return "Fully Laid";
}

function getMultiLayResultsGridRows(
  formState: SportsbookFormState,
  plannerSummary: MultiLayPlannerSummary | null
): MultiLayResultsGridRow[] {
  if (!plannerSummary) {
    return [];
  }

  const backStake = parseNumericInput(formState.back_stake);
  const backOdds = parseNumericInput(formState.back_odds);
  if (backStake === null || backOdds === null) {
    return [];
  }

  const backProfit = backStake * (backOdds - 1);
  const noSelectionRow: MultiLayResultsGridRow = {
    key: "no-selection",
    outcomeLabel: "Back loses",
    bookmakerValue: formatSignedPreviewMoney(-backStake),
    branchValues: Object.fromEntries(
      plannerSummary.legs.map((leg) => [
        leg.key,
        formatSignedPreviewMoney(parseNumericInput(leg.layReturnsAfterCommission) ?? 0),
      ])
    ),
    profit: formatSignedPreviewMoney(parseNumericInput(plannerSummary.noSelectionPnl) ?? 0),
  };

  const landedRows = plannerSummary.legs.map((leg) => ({
    key: leg.key,
    outcomeLabel: `${leg.label} wins`,
    bookmakerValue: formatSignedPreviewMoney(backProfit),
    branchValues: Object.fromEntries(
      plannerSummary.legs.map((branch) => [
        branch.key,
        branch.key === leg.key
          ? formatSignedPreviewMoney(-(parseNumericInput(branch.liability) ?? 0))
          : formatSignedPreviewMoney(parseNumericInput(branch.layReturnsAfterCommission) ?? 0),
      ])
    ),
    profit: formatSignedPreviewMoney(
      parseNumericInput(
        plannerSummary.landedOutcomePnls.find((entry) => entry.key === leg.key)?.pnl ?? "0.00"
      ) ?? 0
    ),
  }));

  return [noSelectionRow, ...landedRows];
}

function getPersistableSportsbookForm(
  formState: SportsbookFormState,
  options: {
    resolvedCommission: string;
    outcome1Label: string;
    extraOutcomes: MultiLayOutcomeInput[];
    partialLayLegs: PartialLayLegInput[];
    primaryPlacement: MultiLayPrimaryPlacementState;
  }
): SportsbookFormState {
  const plannerSummary = getMultiLayPlannerSummary(
    formState,
    options.resolvedCommission,
    options.outcome1Label,
    options.extraOutcomes
  );
  const serializedMatchingData = isMultiLayStrategy(formState.match_strategy)
    ? serializeMultiLayOutcomes(
        formState,
        options.outcome1Label,
        options.primaryPlacement,
        options.extraOutcomes,
        plannerSummary
      )
    : options.partialLayLegs.length > 0
      ? serializePartialLayLegs(options.partialLayLegs)
      : "[]";
  const nextBaseState: SportsbookFormState = {
    ...formState,
    multi_lay_outcome_1_name: isMultiLayStrategy(formState.match_strategy)
      ? options.outcome1Label
      : "",
    multi_lay_outcomes_json: serializedMatchingData,
  };
  if (
    plannerSummary === null ||
    (nextBaseState.match_strategy !== "Multilay" &&
      nextBaseState.match_strategy !== "Multilay-Underlay")
  ) {
    return nextBaseState;
  }

  const placementRows = getMultiLayPlacementRows(
    nextBaseState,
    options.primaryPlacement,
    options.extraOutcomes,
    plannerSummary
  );
  const firstPlacement = placementRows.find((row) => row.key === "outcome1");
  const firstLeg = plannerSummary.legs.find((leg) => leg.key === "outcome1");

  return {
    ...nextBaseState,
    lay_actual:
      firstPlacement?.placedMatchedStake ||
      (firstLeg ? getEffectiveMultiLayStakeForLeg(nextBaseState.match_strategy, firstLeg) : ""),
    lay_matched_stake_1: firstPlacement?.placedMatchedStake || "",
  };
}

export function SportsbookWorkflowShell({ profileId, initialQuery = "" }: { profileId: string; initialQuery?: string }) {
  const { catalogue: bookmakerCatalogue, displaySettings: bookmakerDisplaySettings } =
    useBookmakerCatalogue(profileId);
  const [rows, setRows] = useState<SportsbookRecord[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [accountAuthorities, setAccountAuthorities] = useState<AccountAuthorityRecord[]>([]);
  const [exchangeSettings, setExchangeSettings] = useState<ExchangeCommissionRecord[]>([]);
  const [trackerSettings, setTrackerSettings] = useState<TrackerSettingsRecord | null>(null);
  const [lookupValues, setLookupValues] = useState<LookupValueRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workflowVisible, setWorkflowVisible] = useState(false);
  const [tableCollapsed, setTableCollapsed] = usePersistedBoolean(
    `openforge-ledger-collapsed:${profileId}:sportsbook-bets`,
    false
  );
  const [showBetSetupValidation, setShowBetSetupValidation] = useState(false);
  const [formState, setFormState] = useState<SportsbookFormState>(() => createBlankForm());
  const [pristineFormState, setPristineFormState] = useState<SportsbookFormState>(() =>
    createBlankForm()
  );
  const [tableMode, setTableMode] = usePersistedState<SportsbookTableMode>(
    `openforge-ledger-table-mode:${profileId}:sportsbook-bets`,
    "recent"
  );
  const [tableSort, setTableSort] = useState<SportsbookTableSort | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [tableFilters, setTableFilters] = usePersistedState<SportsbookTableFilterState>(
    `openforge-ledger-table-filters:${profileId}:sportsbook-bets`,
    emptyTableFilters
  );
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<SportsbookColumnKey>>(
    () => new Set(defaultVisibleSportsbookColumns)
  );
  const [columnWidths, setColumnWidths] = useState<SportsbookColumnWidths>(defaultSportsbookColumnWidths);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [previewCalculation, setPreviewCalculation] = useState<SportsbookCalculationPreview | null>(null);
  const [multiLayOutcomes, setMultiLayOutcomes] = useState<MultiLayOutcomeInput[]>(
    createDefaultMultiLayOutcomes
  );
  const [multiLayPrimaryPlacement, setMultiLayPrimaryPlacement] = useState<MultiLayPrimaryPlacementState>(
    createDefaultMultiLayPrimaryPlacementState
  );
  const [partialLayLegs, setPartialLayLegs] = useState<PartialLayLegInput[]>([]);
  const [footballSettlesAssistUsed, setFootballSettlesAssistUsed] = useState(false);
  const [footballSettlesOriginalValue, setFootballSettlesOriginalValue] = useState<string | null>(
    null
  );
  const [pendingLegRemovalId, setPendingLegRemovalId] = useState<string | null>(null);
  const [customSliderMin, setCustomSliderMin] = useState("");
  const [customSliderMax, setCustomSliderMax] = useState("");
  const [lastRemovedPartialLayLeg, setLastRemovedPartialLayLeg] = useState<{
    leg: PartialLayLegInput;
    index: number;
  } | null>(null);
  const [multiLayOutcome1Label, setMultiLayOutcome1Label] = useState("");
  const [settledEditEnabled, setSettledEditEnabled] = useState(false);
  const [outcomeModalState, setOutcomeModalState] = useState<OutcomeModalState | null>(null);
  const [freeBetBridgeModalState, setFreeBetBridgeModalState] = useState<FreeBetBridgeModalState | null>(
    null
  );
  const [isPending, startTransition] = useTransition();
  const editorRef = useRef<HTMLElement | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const isCreatingDraftRef = useRef(false);
  const pageSize = 8;
  const defaultBonusRetentionRate = useMemo(
    () =>
      normalizeBonusRetentionPercentForUi(
        trackerSettings?.default_bonus_retention_percent,
        "70"
      ),
    [trackerSettings]
  );
  const currentDirtyState = useMemo(
    () =>
      getComparableDirtyState(
        formState,
        multiLayOutcome1Label,
        multiLayOutcomes,
        partialLayLegs,
        multiLayPrimaryPlacement
      ),
    [formState, multiLayOutcome1Label, multiLayOutcomes, partialLayLegs, multiLayPrimaryPlacement]
  );
  const pristineDirtyState = useMemo(
    () => {
      const parsedMultiLay = parseMultiLayOutcomes(pristineFormState.multi_lay_outcomes_json, {
        outcome1Label: pristineFormState.multi_lay_outcome_1_name,
        layOdds1: pristineFormState.lay_odds_1,
        exchangeName: pristineFormState.exchange_name,
        layActual: pristineFormState.lay_actual,
      });
      return getComparableDirtyState(
        pristineFormState,
        pristineFormState.multi_lay_outcome_1_name,
        parsedMultiLay.extraOutcomes,
        parsePartialLayLegs(pristineFormState.multi_lay_outcomes_json),
        parsedMultiLay.primaryPlacement
      );
    },
    [pristineFormState]
  );
  const isDirty = useMemo(
    () => JSON.stringify(currentDirtyState) !== JSON.stringify(pristineDirtyState),
    [currentDirtyState, pristineDirtyState]
  );
  const confirmDiscardChanges = useUnsavedChangesGuard(isDirty);
  const clearStatusMessage = useCallback(() => setStatusMessage(""), []);
  const tableColumns = useMemo(
    () =>
      sportsbookTableColumns.filter((column) =>
        visibleColumnKeys.has(column.key as SportsbookColumnKey)
      ),
    [visibleColumnKeys]
  );

  useToastDismiss(statusMessage, clearStatusMessage);

  const revealEditor = useCallback(
    (options?: { expandLedger?: boolean }) => {
      if (options?.expandLedger ?? true) {
        setTableCollapsed(false);
      }
      scrollToElementTopAfterRender(() => editorRef.current);
    },
    [setTableCollapsed]
  );

  useTrackerRouteReselect(() => {
    setTableCollapsed(false);
    if (workflowVisible) {
      scrollToElementTopAfterRender(() => editorRef.current);
    }
  });

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const loadRows = useCallback(
    async (preferredSelection?: string | null) => {
      const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to load sportsbook rows");
      }

      const nextRows = (await response.json()) as SportsbookRecord[];
      startTransition(() => {
        setRows(nextRows);
        setIsInitialLoading(false);
        const nextSelectedCandidate =
          preferredSelection === undefined ? selectedIdRef.current : preferredSelection;
        const selected =
          nextSelectedCandidate &&
          nextRows.some((row) => row.sportsbook_bet_id === nextSelectedCandidate)
            ? nextSelectedCandidate
            : null;
        setSelectedId(selected);
        if (selected) {
          isCreatingDraftRef.current = false;
          const activeRecord = nextRows.find((row) => row.sportsbook_bet_id === selected);
          if (activeRecord) {
            const nextFormState = recordToForm(activeRecord);
            const parsedMultiLay = parseMultiLayOutcomes(activeRecord.multi_lay_outcomes_json, {
              outcome1Label: activeRecord.multi_lay_outcome_1_name,
              layOdds1: activeRecord.lay_odds_1,
              exchangeName: activeRecord.exchange_name,
              layActual: activeRecord.lay_actual,
            });
            setMultiLayOutcome1Label(getMultiLayOutcomeLabel(activeRecord.multi_lay_outcome_1_name));
            setMultiLayOutcomes(parsedMultiLay.extraOutcomes);
            setMultiLayPrimaryPlacement(parsedMultiLay.primaryPlacement);
            setPartialLayLegs(parsePartialLayLegs(activeRecord.multi_lay_outcomes_json));
            setFormState(nextFormState);
            setPristineFormState(nextFormState);
            setShowBetSetupValidation(false);
            setSettledEditEnabled(false);
            setFootballSettlesAssistUsed(false);
            setFootballSettlesOriginalValue(null);
          }
          setWorkflowVisible(true);
        } else {
          if (isCreatingDraftRef.current) {
            setWorkflowVisible(true);
            return;
          }
          const blankForm = createBlankForm(defaultBonusRetentionRate);
          setMultiLayOutcomes(createDefaultMultiLayOutcomes());
          setMultiLayPrimaryPlacement(createDefaultMultiLayPrimaryPlacementState());
          setPartialLayLegs([]);
          setMultiLayOutcome1Label("");
          setFormState(blankForm);
          setPristineFormState(blankForm);
          setShowBetSetupValidation(false);
          setSettledEditEnabled(false);
          setFootballSettlesAssistUsed(false);
          setFootballSettlesOriginalValue(null);
          setWorkflowVisible(false);
        }
      });
    },
    [defaultBonusRetentionRate, profileId, startTransition]
  );

  const loadExchangeSettings = useCallback(async () => {
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/exchange-commissions`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Unable to load exchange settings");
    }
    const nextRows = (await response.json()) as ExchangeCommissionRecord[];
    setExchangeSettings(nextRows);
  }, [profileId]);

  const loadAccountAuthorities = useCallback(async () => {
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/accounts`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Unable to load account authorities");
    }
    const nextRows = (await response.json()) as AccountAuthorityRecord[];
    setAccountAuthorities(nextRows);
  }, [profileId]);

  const loadLookupValues = useCallback(async () => {
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/lookup-values`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Unable to load workbook authority lists");
    }
    const nextRows = (await response.json()) as LookupValueRecord[];
    setLookupValues(nextRows);
  }, [profileId]);

  const loadTrackerSettings = useCallback(async () => {
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/tracker-settings`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Unable to load tracker date settings");
    }
    const responsePayload = (await response.json()) as TrackerSettingsRecord;
    const nextSettings = {
      ...responsePayload,
      default_bonus_retention_percent: normalizeBonusRetentionPercentForUi(
        responsePayload.default_bonus_retention_percent
      ),
    };
    setTrackerSettings(nextSettings);
  }, [profileId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void Promise.all([
        loadRows(),
        loadExchangeSettings(),
        loadAccountAuthorities(),
        loadLookupValues(),
        loadTrackerSettings(),
      ]).catch((error: Error) => {
        setIsInitialLoading(false);
        setErrorMessage(error.message);
        setStatusMessage("Sportsbook workflow could not be loaded.");
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    loadAccountAuthorities,
    loadExchangeSettings,
    loadLookupValues,
    loadRows,
    loadTrackerSettings,
  ]);

  const placedRange = useMemo(() => {
    return resolveDateRange({
      preset: trackerSettings?.active_date_preset ?? "Week (Mon-Sun)",
      customStart: trackerSettings?.custom_start_date,
      customEnd: trackerSettings?.custom_end_date,
      rangeBackDays: trackerSettings?.range_back_days,
      rangeForwardDays: trackerSettings?.range_forward_days,
    });
  }, [trackerSettings]);

  const bookmakerOptions = useMemo(
    () =>
      dedupeOptions([
        ...getAccountNamesByType(accountAuthorities, "Bookie"),
        ...getLookupValuesByType(lookupValues, "bookmaker"),
        ...rows.map((row) => row.bookmaker),
        formState.bookmaker,
      ]),
    [accountAuthorities, formState.bookmaker, lookupValues, rows]
  );

  const offerTypeOptions = useMemo(
    () => getOfferTypeOptions(formState.offer_type),
    [formState.offer_type]
  );

  const betTypeOptionsResolved = useMemo(
    () =>
      dedupeOptions([
        ...getAllowedBetTypesForOfferType(formState.offer_type, formState.bet_type),
      ]),
    [formState.bet_type, formState.offer_type]
  );

  const fixtureTypeOptionsResolved = useMemo(
    () =>
      dedupeOptions([
        ...fixtureTypeOptions,
        ...rows.map((row) => row.fixture_type),
        formState.fixture_type,
      ]),
    [formState.fixture_type, rows]
  );

  const offerNameOptions = useMemo(() => {
    const workbookOfferNames = getLookupValuesByType(lookupValues, "offer_name");
    if (workbookOfferNames.length > 0) {
      return filterCampaignTagOptions(workbookOfferNames, {
        offerType: formState.offer_type,
        currentValue: formState.offer_name,
      });
    }

    const scopedRows = rows.filter((row) => {
      if (!row.offer_name.trim()) {
        return false;
      }

      const bookmakerMatches = formState.bookmaker.trim()
        ? row.bookmaker === formState.bookmaker
        : true;
      const offerTypeMatches = formState.offer_type.trim()
        ? row.offer_type === formState.offer_type
        : true;

      return bookmakerMatches && offerTypeMatches;
    });
    const fallbackRows = rows.filter((row) => row.offer_name.trim());
    const sourceRows = scopedRows.length > 0 ? scopedRows : fallbackRows;
    return filterCampaignTagOptions(sourceRows.map((row) => row.offer_name), {
      offerType: formState.offer_type,
      currentValue: formState.offer_name,
    });
  }, [formState.bookmaker, formState.offer_name, formState.offer_type, lookupValues, rows]);
  const offerTypeDescriptor = useMemo(
    () => getOfferTypeDescriptor(formState.offer_type),
    [formState.offer_type]
  );

  const freeBetBridgeBetTypeOptions = useMemo(
    () =>
      freeBetBridgeModalState
        ? getAllowedBetTypesForOfferType(
            freeBetBridgeModalState.offer_type,
            freeBetBridgeModalState.bet_type
          )
        : [],
    [freeBetBridgeModalState]
  );

  const freeBetBridgeCampaignTagOptions = useMemo(() => {
    if (!freeBetBridgeModalState) {
      return [];
    }

    const workbookOfferNames = getLookupValuesByType(lookupValues, "offer_name");
    if (workbookOfferNames.length > 0) {
      return filterCampaignTagOptions(workbookOfferNames, {
        offerType: freeBetBridgeModalState.offer_type,
        currentValue: freeBetBridgeModalState.offer_name,
      });
    }

    const scopedRows = rows.filter((row) => {
      if (!row.offer_name.trim()) {
        return false;
      }

      const bookmakerMatches = freeBetBridgeModalState.bookmaker.trim()
        ? row.bookmaker === freeBetBridgeModalState.bookmaker
        : true;
      const offerTypeMatches = freeBetBridgeModalState.offer_type.trim()
        ? row.offer_type === freeBetBridgeModalState.offer_type
        : true;

      return bookmakerMatches && offerTypeMatches;
    });
    const fallbackRows = rows.filter((row) => row.offer_name.trim());
    const sourceRows = scopedRows.length > 0 ? scopedRows : fallbackRows;
    return filterCampaignTagOptions(sourceRows.map((row) => row.offer_name), {
      offerType: freeBetBridgeModalState.offer_type,
      currentValue: freeBetBridgeModalState.offer_name,
    });
  }, [freeBetBridgeModalState, lookupValues, rows]);

  const specialOfferBookmakerSuggestion = useMemo(
    () =>
      getSpecialOfferBookmakerSuggestion({
        offerType: formState.offer_type,
        offerName: formState.offer_name,
        offerText: formState.offer_text,
        bookmaker: formState.bookmaker,
        accountAuthorities,
      }),
    [accountAuthorities, formState.bookmaker, formState.offer_name, formState.offer_text, formState.offer_type]
  );

  const exchangeOptions = useMemo(() => {
    const options = dedupeOptions([
      ...exchangeSettings.map((row) => row.exchange_name),
      ...getAccountNamesByType(accountAuthorities, "Exchange"),
      ...getLookupValuesByType(lookupValues, "exchange"),
      ...rows.map((row) => row.exchange_name),
      formState.exchange_name,
    ]);

    if (formState.offer_type === "Mug Bet") {
      return options;
    }

    return options.filter((option) => option.toLowerCase() !== "no exchange");
  }, [accountAuthorities, exchangeSettings, formState.exchange_name, formState.offer_type, lookupValues, rows]);

  const resolvedCommission = useMemo(() => {
    return (
      exchangeSettings.find((row) => row.exchange_name === formState.exchange_name)?.commission_rate ??
      ""
    );
  }, [exchangeSettings, formState.exchange_name]);

  const resultOptions = useMemo(
    () =>
      getSportsbookResultOptions(
        formState.offer_type,
        formState.match_strategy,
        formState.bonus_trigger
      ),
    [formState.bonus_trigger, formState.match_strategy, formState.offer_type]
  );

  const isNoLayStrategy = formState.match_strategy === "No Lay";
  const usesMultiLayStrategy = isMultiLayStrategy(formState.match_strategy);
  const canUseFootballSettlesAssist =
    formState.fixture_type === "Football" && formState.date_settled.trim().length > 0;
  const showsLayMatchedStake =
    formState.match_strategy === "Partial Lay" || usesMultiLayStrategy;
  const showsPlacementSection = !isNoLayStrategy && showsLayMatchedStake;
  const isDdhhOffer = formState.offer_type === "Double Delight / Hat-trick Heaven";
  const isCashbackOffer =
    formState.offer_type === "Cashback" || formState.offer_type === "Refund";
  const isRefundOffer = formState.offer_type === "Refund";
  const isFreeBetAwardableRow = isFreeBetAwardingOffer(formState.offer_type);
  const betSetupComplete = useMemo(() => getBetSetupComplete(formState), [formState]);
  const missingBetSetupFields = useMemo(() => getMissingBetSetupFields(formState), [formState]);
  const hasPersistedDraft = Boolean(formState.sportsbook_bet_id ?? selectedId);
  const calculatorUnlocked = betSetupComplete;
  const betSetupValidationActive = showBetSetupValidation;

  const layStakePreview = useMemo(
    () => getLayStakePreview(formState, resolvedCommission),
    [formState, resolvedCommission]
  );

  const selectedSportsbookRow = useMemo(
    () => rows.find((row) => row.sportsbook_bet_id === selectedId) ?? null,
    [rows, selectedId]
  );
  const isSettledBet = selectedSportsbookRow?.status === "Settled";
  const isSettledReadOnly = Boolean(isSettledBet && !settledEditEnabled);
  const isPreviewReady = useMemo(
    () => hasPreviewInputsReady(formState, resolvedCommission),
    [formState, resolvedCommission]
  );
  const missingCalculatorFields = useMemo(
    () => getCalculatorMissingFields(formState, resolvedCommission, multiLayOutcomes),
    [formState, multiLayOutcomes, resolvedCommission]
  );
  const missingPlacementFields = useMemo(
    () => getMissingPlacementFields(formState, resolvedCommission, multiLayOutcomes),
    [formState, multiLayOutcomes, resolvedCommission]
  );
  const placementPlanRequired =
    formState.status === "Placed" ||
    formState.status === "Settled" ||
    formState.status === "Free Bet Awarded" ||
    formState.result !== "Pending";
  const previewFormState = useMemo(
    () =>
      getPersistableSportsbookForm(formState, {
        resolvedCommission,
        outcome1Label: multiLayOutcome1Label,
        extraOutcomes: multiLayOutcomes,
        partialLayLegs,
        primaryPlacement: multiLayPrimaryPlacement,
      }),
    [formState, multiLayOutcome1Label, multiLayOutcomes, partialLayLegs, multiLayPrimaryPlacement, resolvedCommission]
  );
  const calculatorGuidance = useMemo(
    () => getCalculatorGuidance(formState, resolvedCommission),
    [formState, resolvedCommission]
  );
  const scenarioBranchLabels = useMemo(
    () =>
      getScenarioBranchLabels(
        formState.offer_type,
        formState.match_strategy,
        formState.bonus_trigger,
        multiLayOutcome1Label,
        multiLayOutcomes
      ),
    [
      formState.bonus_trigger,
      formState.match_strategy,
      formState.offer_type,
      multiLayOutcome1Label,
      multiLayOutcomes,
    ]
  );
  const activePreviewCalculation = betSetupComplete ? previewCalculation : null;
  const multiLayPlannerSummary = useMemo(
    () =>
      getMultiLayPlannerSummary(
        formState,
        resolvedCommission,
        multiLayOutcome1Label,
        multiLayOutcomes
      ),
    [formState, resolvedCommission, multiLayOutcome1Label, multiLayOutcomes]
  );
  const multiLayPlacementRows = useMemo(
    () =>
      getMultiLayPlacementRows(
        formState,
        multiLayPrimaryPlacement,
        multiLayOutcomes,
        multiLayPlannerSummary
      ),
    [formState, multiLayOutcomes, multiLayPlannerSummary, multiLayPrimaryPlacement]
  );
  const multiLayPlacementStatus = useMemo(
    () => getMultiLayPlacementStatus(multiLayPlacementRows),
    [multiLayPlacementRows]
  );
  const multiLayResultsGridRows = useMemo(
    () => getMultiLayResultsGridRows(formState, multiLayPlannerSummary),
    [formState, multiLayPlannerSummary]
  );
  const showCalculationSummary =
    hasPersistedDraft ||
    (activePreviewCalculation !== null && activePreviewCalculation.calculation_state !== "incomplete");
  const activeCalculationState =
    activePreviewCalculation?.calculation_state ?? selectedSportsbookRow?.calculation_state ?? null;
  const activeCalculationNotes =
    activePreviewCalculation?.calculation_notes.length
      ? activePreviewCalculation.calculation_notes
      : selectedSportsbookRow?.calculation_notes ?? [];
  const visibleCalculationNotes = activeCalculationNotes.filter(
    (note) => note !== "Pending row uses projected current value until settlement."
  );
  const activeMatchRating =
    activePreviewCalculation !== null
      ? activePreviewCalculation.match_rating
      : selectedSportsbookRow?.match_rating ?? null;
  const activeMatchRatingRatio = parseNumericInput(activeMatchRating ?? "");
  const activeMatchRatingPercentValue =
    activeMatchRatingRatio === null ? null : activeMatchRatingRatio * 100;
  const showMatchRatingPill = Boolean(
    formState.lay_actual.trim() && activeMatchRatingPercentValue !== null
  );
  const activeMatchRatingDisplay =
    activeMatchRatingPercentValue === null
      ? null
      : activeMatchRatingPercentValue.toFixed(2);
  const activeMatchRatingTone =
    activeMatchRatingPercentValue === null
      ? null
      : getMatchRatingPillTone(activeMatchRatingPercentValue);
  const activeMatchRatingInterpretation =
    activeMatchRatingPercentValue === null
      ? null
      : getMatchRatingInterpretation(activeMatchRatingPercentValue);
  const isCalculatedState = activeCalculationState === "resolved";
  const workflowRule = useMemo(
    () =>
      getSportsbookWorkflowRule(
        formState.offer_type,
        formState.match_strategy,
        formState.bonus_trigger
      ),
    [formState.bonus_trigger, formState.match_strategy, formState.offer_type]
  );
  const settlementReviewRule = useMemo(
    () =>
      getSettlementReviewRule(
        formState.offer_type,
        formState.result,
        formState.match_strategy
      ),
    [formState.match_strategy, formState.offer_type, formState.result]
  );
  const calculatorRuleItems = useMemo(() => {
    const items: string[] = [];

    if (workflowRule) {
      items.push(workflowRule);
    }

    if (isDdhhOffer) {
      items.push("DD/HH branches: first scorer only, scores again, hat-trick, or lay wins.");
    }

    if (isRefundOffer) {
      items.push(
        `Refund trigger ${formState.bonus_trigger || "Lay Wins"} • Max bonus ${formState.maximum_bonus || "—"} • Retention ${formState.bonus_retention_rate || defaultBonusRetentionRate}%`
      );
    }

    if (isCashbackOffer && !isRefundOffer) {
      items.push(
        `Cashback trigger ${formState.bonus_trigger || "Lay Wins"} • Cap ${formState.maximum_bonus || "—"}`
      );
    }

    if (isNoLayStrategy) {
      items.push("No lay: current value stays on the back-side cash path.");
    }

    if (usesMultiLayStrategy) {
      items.push("Multi-lay: each named outcome needs its own lay odds branch.");
    }

    return items;
  }, [
    formState.bonus_retention_rate,
    formState.bonus_trigger,
    formState.maximum_bonus,
    defaultBonusRetentionRate,
    isCashbackOffer,
    isDdhhOffer,
    isNoLayStrategy,
    isRefundOffer,
    usesMultiLayStrategy,
    workflowRule,
  ]);
  const partialLayExecutionSummary = useMemo(
    () =>
      getPartialLayExecutionSummary({
        explicitTargetLayStake: formState.lay_actual,
        suggestedTargetLayStake: layStakePreview?.suggested ?? "",
        legs: partialLayLegs.map((leg) => ({
          matchedStake: leg.matchedStake,
        })),
      }),
    [formState.lay_actual, layStakePreview?.suggested, partialLayLegs]
  );
  const recommendedNextLayStakeValue = partialLayExecutionSummary.nextRecommendedStake;
  const recommendedNextLayStakeDisplay =
    recommendedNextLayStakeValue === null ? "—" : formatPreviewMoney(recommendedNextLayStakeValue);
  const canCopyRecommendedNextLayStake =
    recommendedNextLayStakeValue !== null && recommendedNextLayStakeValue > 0;
  const hasPartialLayShortfall =
    partialLayExecutionSummary.remainingToMatch !== null &&
    partialLayExecutionSummary.remainingToMatch > 0;
  const hasPartialLayOvermatch = partialLayExecutionSummary.exceededTarget;

  const editorHeaderFullTitle = useMemo(() => {
    const offerText = formState.offer_text.trim();
    if (offerText) {
      return offerText;
    }

    const eventName = formState.event_name.trim();
    if (eventName) {
      return eventName;
    }

    return "New sportsbook row";
  }, [formState.event_name, formState.offer_text]);
  const editorHeaderTitle = useMemo(
    () => truncateHeaderTitle(editorHeaderFullTitle, 75),
    [editorHeaderFullTitle]
  );
  const settlesDisplay = useMemo(
    () => formatEditorSettlesDate(fromDateTimeLocalValue(formState.date_settled)),
    [formState.date_settled]
  );
  const settlesCountdownDisplay = useMemo(
    () => formatSettlesCountdown(fromDateTimeLocalValue(formState.date_settled)),
    [formState.date_settled]
  );
  const backPlacementReady =
    parseNumericInput(formState.back_stake) !== null && parseNumericInput(formState.back_odds) !== null;
  const layPlacementReady =
    formState.match_strategy.trim().length > 0 &&
    formState.exchange_name.trim().length > 0 &&
    (usesMultiLayStrategy || parseNumericInput(formState.lay_odds_1) !== null);

  const isCustomStrategy = formState.match_strategy === "Custom";

  const customSliderBackStake = parseNumericInput(formState.back_stake) ?? 10;
  const customSliderEffectiveMin = parseNumericInput(customSliderMin)
    ?? Math.max(0.01, Number((customSliderBackStake - 1).toFixed(2)));
  const customSliderEffectiveMax = parseNumericInput(customSliderMax)
    ?? Number((customSliderBackStake + 1).toFixed(2));
  const customSliderCurrentFloat =
    parseNumericInput(formState.lay_actual) ?? customSliderEffectiveMin;

  const customSliderFeedback = useMemo(() => {
    if (!isCustomStrategy) {
      return null;
    }
    const layStake = parseNumericInput(formState.lay_actual);
    const layOdds = parseNumericInput(formState.lay_odds_1);
    const backStake = parseNumericInput(formState.back_stake);
    const backOdds = parseNumericInput(formState.back_odds);
    const commission = parseNumericInput(resolvedCommission) ?? 0;

    if (layStake === null || layOdds === null || backStake === null || backOdds === null) {
      return null;
    }

    const liability = layStake * (layOdds - 1);
    const backWinsPnl = backStake * (backOdds - 1) - liability;
    const layWinsPnl = layStake * (1 - commission) - backStake;

    return {
      liability: formatPreviewMoney(liability),
      backWinsPnl: formatPreviewMoney(backWinsPnl),
      layWinsPnl: formatPreviewMoney(layWinsPnl),
    };
  }, [
    isCustomStrategy,
    formState.lay_actual,
    formState.lay_odds_1,
    formState.back_stake,
    formState.back_odds,
    resolvedCommission,
  ]);

  useEffect(() => {
    if (!betSetupComplete) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetch(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...previewFormState,
          lay_commission_1: "",
          date_settled: fromDateTimeLocalValue(previewFormState.date_settled),
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(await response.text());
          }
          return (await response.json()) as SportsbookCalculationPreview;
        })
        .then((payload) => setPreviewCalculation(payload))
        .catch(() => setPreviewCalculation(null));
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [betSetupComplete, previewFormState, profileId]);

  const reviewRows = useMemo(() => {
    const nextRows = [...rows];

    if (tableMode === "prospecting") {
      return nextRows
        .filter((row) => row.status === "Prospecting")
        .sort((left, right) => {
          const rightCreated = getComparableDate(right.created_at) ?? 0;
          const leftCreated = getComparableDate(left.created_at) ?? 0;
          return rightCreated - leftCreated;
        });
    }

    if (tableMode === "underlays") {
      return nextRows
        .filter((row) => row.match_strategy === "Underlay")
        .sort((left, right) => {
          const rightCreated = getComparableDate(right.created_at) ?? 0;
          const leftCreated = getComparableDate(left.created_at) ?? 0;
          return rightCreated - leftCreated;
        });
    }

    if (tableMode === "overlays") {
      return nextRows
        .filter((row) => row.match_strategy === "Overlay")
        .sort((left, right) => {
          const rightCreated = getComparableDate(right.created_at) ?? 0;
          const leftCreated = getComparableDate(left.created_at) ?? 0;
          return rightCreated - leftCreated;
        });
    }

    if (tableMode === "settling-soon") {
      return nextRows.sort((left, right) => {
        if (left.counts_as_open !== right.counts_as_open) {
          return left.counts_as_open ? -1 : 1;
        }

        const leftSettles = getComparableDate(left.date_settled);
        const rightSettles = getComparableDate(right.date_settled);

        if (leftSettles === null && rightSettles === null) {
          const rightCreated = getComparableDate(right.created_at) ?? 0;
          const leftCreated = getComparableDate(left.created_at) ?? 0;
          return rightCreated - leftCreated;
        }

        if (leftSettles === null) {
          return 1;
        }

        if (rightSettles === null) {
          return -1;
        }

        return leftSettles - rightSettles;
      });
    }

    if (tableMode === "pending-placed") {
      return filterPlacedPendingRowsInDateRange(
        nextRows,
        placedRange.start.getTime(),
        placedRange.end.getTime()
      );
    }

    return nextRows.sort((left, right) => {
      const rightCreated = getComparableDate(right.created_at) ?? 0;
      const leftCreated = getComparableDate(left.created_at) ?? 0;
      return rightCreated - leftCreated;
    });
  }, [placedRange.end, placedRange.start, rows, tableMode]);

  const sortedReviewRows = useMemo(() => {
    return sortSportsbookRows(reviewRows, tableSort);
  }, [reviewRows, tableSort]);

  const sportsbookRowsById = useMemo(
    () => new Map(rows.map((row) => [row.sportsbook_bet_id, row])),
    [rows]
  );

  const sportsbookFilterOptions = useMemo(() => {
    const bookmakers = dedupeOptions([
      ...getAccountNamesByType(accountAuthorities, "Bookie"),
      ...rows.map((row) => row.bookmaker),
    ]);

    const offerTypes = dedupeOptions(rows.map((row) => row.offer_type));
    const fixtureTypes = dedupeOptions(rows.map((row) => row.fixture_type));
    const betTypes = dedupeOptions(rows.map((row) => row.bet_type));
    const strategies = dedupeOptions(rows.map((row) => row.match_strategy));
    const layStatuses = dedupeOptions(rows.map((row) => row.lay_status));
    const backBetStatuses = dedupeOptions(
      rows.map((row) => getSportsbookBackBetStatusBadge(row).label)
    );
    const statuses = dedupeOptions(rows.map((row) => row.status));

    return {
      bookmakers,
      offerTypes,
      fixtureTypes,
      betTypes,
      strategies,
      layStatuses,
      backBetStatuses,
      statuses,
    };
  }, [accountAuthorities, rows]);

  const sportsbookFilteredReviewRows = useMemo(() => {
    return sortedReviewRows.filter((row) => {
      if (tableFilters.bookmaker && row.bookmaker !== tableFilters.bookmaker) {
        return false;
      }
      if (tableFilters.offer_type && row.offer_type !== tableFilters.offer_type) {
        return false;
      }
      if (tableFilters.fixture_type && row.fixture_type !== tableFilters.fixture_type) {
        return false;
      }
      if (tableFilters.bet_type && row.bet_type !== tableFilters.bet_type) {
        return false;
      }
      if (tableFilters.match_strategy && row.match_strategy !== tableFilters.match_strategy) {
        return false;
      }
      if (tableFilters.lay_status && row.lay_status !== tableFilters.lay_status) {
        return false;
      }
      if (
        tableFilters.back_bet_status &&
        getSportsbookBackBetStatusBadge(row).label !== tableFilters.back_bet_status
      ) {
        return false;
      }
      if (tableFilters.status && row.status !== tableFilters.status) {
        return false;
      }
      if (!getIssueFilterMatch(row, tableFilters.issue_type)) {
        return false;
      }

      const displayedValue = parseCurrencyLikeValue(getDisplayedValueForRow(row));
      const minValue = parseCurrencyLikeValue(tableFilters.min_value);
      const maxValue = parseCurrencyLikeValue(tableFilters.max_value);

      if (minValue !== null && (displayedValue === null || displayedValue < minValue)) {
        return false;
      }
      if (maxValue !== null && (displayedValue === null || displayedValue > maxValue)) {
        return false;
      }

      return true;
    });
  }, [sortedReviewRows, tableFilters]);

  const filteredRows = useMemo(() => {
    const tableRows: TrackerRow[] = sportsbookFilteredReviewRows.map((row) => ({
      sportsbook_bet_id: row.sportsbook_bet_id,
      date_settled: formatTableSettlesDate(row.date_settled, placedRange),
      bookmaker: row.bookmaker,
      offer_text: row.offer_text,
      offer_name: row.offer_name,
      offer_details: getOfferDetailsText(row),
      event_name: row.event_name,
      bet_type: row.bet_type,
      match_strategy: row.match_strategy,
      lay_status: row.lay_status,
      back_bet_status: getSportsbookBackBetStatusBadge(row).label,
      displayed_value: getDisplayedValueForRow(row),
      displayed_value_label: getDisplayedValueLabelForRow(row),
      status: row.status,
      actions: "Actions",
    }));

    return filterTrackerRows(tableRows, sportsbookTableColumns, query);
  }, [placedRange, query, sportsbookFilteredReviewRows]);

  const quickView = useMemo(() => {
    const rangeRows = rows.filter((row) =>
      isDateWithinResolvedRange(getSportsbookRangeAnchor(row), placedRange)
    );
    const totalReportingValue = rangeRows.reduce((sum, row) => {
      const value = parseNumericInput(
        row.reporting_value ?? row.final_net_pnl ?? row.projected_current_pnl ?? ""
      );
      return sum + (value ?? 0);
    }, 0);

    return {
      openCount: rangeRows.filter((row) => row.counts_as_open).length,
      overdueCount: rangeRows.filter((row) => row.is_overdue).length,
      placedCount: rangeRows.filter((row) => row.status === "Placed").length,
      placeholderCount: rangeRows.filter((row) => sportsbookPlaceholderStatuses.has(row.status)).length,
      underlayCount: rangeRows.filter((row) => row.match_strategy === "Underlay").length,
      noLayCount: rangeRows.filter((row) => row.match_strategy === "No Lay").length,
      settlingCount: rangeRows.filter((row) => row.date_settled.trim()).length,
      totalReportingValue,
    };
  }, [placedRange, rows]);

  const pageCount = getTrackerPageCount(filteredRows.length, pageSize);
  const effectivePage = Math.min(currentPage, pageCount);
  const pagedRows = useMemo(
    () => paginateTrackerRows(filteredRows, effectivePage, pageSize),
    [effectivePage, filteredRows]
  );

  const toggleTableSort = useCallback((key: SportsbookSortKey) => {
    setTableSort((current) => getNextSportsbookTableSort(current, key));
  }, []);

  const activeFilterCount = useMemo(
    () =>
      Object.entries(tableFilters).filter(([key, value]) => {
        if (key === "issue_type") {
          return value !== "any";
        }
        return String(value).trim() !== "";
      }).length,
    [tableFilters]
  );
  const hiddenColumnCount = useMemo(
    () =>
      Array.from(columnHideableKeys).filter((columnKey) => !visibleColumnKeys.has(columnKey)).length,
    [visibleColumnKeys]
  );
  const activeTableControlCount =
    activeFilterCount + hiddenColumnCount + (tableMode !== "recent" ? 1 : 0);
  const hasActiveTableControls = activeTableControlCount > 0;

  const updateTableFilter = useCallback(
    <K extends keyof SportsbookTableFilterState>(key: K, value: SportsbookTableFilterState[K]) => {
      setTableFilters((current) => ({
        ...current,
        [key]: value,
      }));
      setCurrentPage(1);
    },
    [setTableFilters]
  );

  const toggleColumnVisibility = useCallback(
    (columnKey: SportsbookColumnKey) => {
      if (!columnHideableKeys.has(columnKey)) {
        return;
      }

      const isCurrentlyVisible = visibleColumnKeys.has(columnKey);

      setVisibleColumnKeys((current) => {
        const next = new Set(current);
        if (isCurrentlyVisible) {
          next.delete(columnKey);
        } else {
          next.add(columnKey);
        }
        return next;
      });

      if (!isCurrentlyVisible) {
        return;
      }

      setTableFilters((current) => {
        if (columnKey === "match_strategy") {
          return { ...current, match_strategy: "" };
        }

        if (columnKey === "offer_details") {
          return {
            ...current,
            offer_type: "",
            fixture_type: "",
            bet_type: "",
          };
        }

        return current;
      });
    },
    [setTableFilters, visibleColumnKeys]
  );

  const clearTableFilters = useCallback(() => {
    setTableMode("recent");
    setTableFilters(emptyTableFilters);
    setCurrentPage(1);
  }, [setTableFilters, setTableMode]);

  const strategyColumnVisible = visibleColumnKeys.has("match_strategy");
  const offerDetailsColumnVisible = visibleColumnKeys.has("offer_details");

  const startColumnResize = useCallback(
    (
      event: ReactMouseEvent,
      columnKey: SportsbookColumnKey,
      headerCell: HTMLTableCellElement | null
    ) => {
      event.preventDefault();
      event.stopPropagation();

      const startingWidth =
        headerCell?.getBoundingClientRect().width ??
        columnWidths[columnKey] ??
        defaultSportsbookColumnWidths[columnKey];
      const startX = event.clientX;

      const handlePointerMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const nextWidth = Math.max(96, Math.round(startingWidth + delta));
        setColumnWidths((current) => ({
          ...current,
          [columnKey]: nextWidth,
        }));
      };

      const handlePointerUp = () => {
        window.removeEventListener("mousemove", handlePointerMove);
        window.removeEventListener("mouseup", handlePointerUp);
      };

      window.addEventListener("mousemove", handlePointerMove);
      window.addEventListener("mouseup", handlePointerUp);
    },
    [columnWidths]
  );

  const autosizeColumn = useCallback(
    (
      columnKey: SportsbookColumnKey,
      headerCell: HTMLTableCellElement | null,
      tableElement: HTMLTableElement | null
    ) => {
      if (!tableElement || !headerCell) {
        return;
      }

      const columnIndex = tableColumns.findIndex((column) => column.key === columnKey);
      if (columnIndex < 0) {
        return;
      }

      const candidates: number[] = [headerCell.scrollWidth + 32];
      const rowElements = Array.from(tableElement.tBodies[0]?.rows ?? []);

      rowElements.forEach((row) => {
        const cell = row.cells.item(columnIndex);
        if (!cell) {
          return;
        }
        const childWidth = cell.firstElementChild?.scrollWidth ?? 0;
        const cellWidth = Math.max(cell.scrollWidth + 28, childWidth + 28);
        candidates.push(cellWidth);
      });

      const nextWidth = Math.max(96, Math.min(420, Math.ceil(Math.max(...candidates))));
      setColumnWidths((current) => ({
        ...current,
        [columnKey]: nextWidth,
      }));
    },
    [tableColumns]
  );

  function selectRow(rowId: string, options?: { collapseTable?: boolean }) {
    if (rowId !== selectedId && isDirty && !confirmDiscardChanges()) {
      return;
    }
    const record = rows.find((entry) => entry.sportsbook_bet_id === rowId);
    if (!record) {
      return;
    }
    setSelectedId(rowId);
    isCreatingDraftRef.current = false;
    setPreviewCalculation(null);
    const nextFormState = recordToForm(record);
    const parsedMultiLay = parseMultiLayOutcomes(record.multi_lay_outcomes_json, {
      outcome1Label: record.multi_lay_outcome_1_name,
      layOdds1: record.lay_odds_1,
      exchangeName: record.exchange_name,
      layActual: record.lay_actual,
    });
    setMultiLayOutcomes(parsedMultiLay.extraOutcomes);
    setMultiLayPrimaryPlacement(parsedMultiLay.primaryPlacement);
    setPartialLayLegs(parsePartialLayLegs(record.multi_lay_outcomes_json));
    setMultiLayOutcome1Label(getMultiLayOutcomeLabel(record.multi_lay_outcome_1_name));
    setFormState(nextFormState);
    setPristineFormState(nextFormState);
    setShowBetSetupValidation(false);
    setSettledEditEnabled(false);
    setFootballSettlesAssistUsed(false);
    setFootballSettlesOriginalValue(null);
    setErrorMessage("");
    setWorkflowVisible(true);
    setTableCollapsed(Boolean(options?.collapseTable));
    setStatusMessage(`Opened sportsbook bet ${rowId} for editing.`);
    revealEditor({ expandLedger: !options?.collapseTable });
  }

  function startNewRow() {
    if (isDirty && !confirmDiscardChanges()) {
      return;
    }
    setSelectedId(null);
    isCreatingDraftRef.current = true;
    setWorkflowVisible(true);
    setTableCollapsed(false);
    setPreviewCalculation(null);
    setMultiLayOutcomes(createDefaultMultiLayOutcomes());
    setMultiLayPrimaryPlacement(createDefaultMultiLayPrimaryPlacementState());
    setPartialLayLegs([]);
    setMultiLayOutcome1Label("");
    const blankForm = createBlankForm(defaultBonusRetentionRate);
    setFormState(blankForm);
    setPristineFormState(blankForm);
    setShowBetSetupValidation(false);
    setSettledEditEnabled(false);
    setFootballSettlesAssistUsed(false);
    setFootballSettlesOriginalValue(null);
    setErrorMessage("");
    setStatusMessage("New sportsbook bet ready. Complete the required fields, then save.");
    revealEditor({ expandLedger: true });
  }

  function closeEditor() {
    if (isDirty && !confirmDiscardChanges()) {
      return;
    }
    setWorkflowVisible(false);
    isCreatingDraftRef.current = false;
    setTableCollapsed(false);
    setStatusMessage("");
  }

  function canPersistForm(nextFormState: SportsbookFormState): boolean {
    return (
      getBetSetupComplete(nextFormState) &&
      getMissingPlacementFields(nextFormState, resolvedCommission, multiLayOutcomes).length === 0
    );
  }

  async function persistForm(
    nextFormState: SportsbookFormState,
    options?: {
      autosaveLabel?: string;
      suppressMissingRequiredMessage?: boolean;
      returnToLedgerOnSuccess?: boolean;
      multiLayOutcomesOverride?: MultiLayOutcomeInput[];
      multiLayPrimaryPlacementOverride?: MultiLayPrimaryPlacementState;
      partialLayLegsOverride?: PartialLayLegInput[];
    }
  ) {
    setErrorMessage("");
    const resolvedMultiLayOutcomes = options?.multiLayOutcomesOverride ?? multiLayOutcomes;
    const resolvedMultiLayPrimaryPlacement =
      options?.multiLayPrimaryPlacementOverride ?? multiLayPrimaryPlacement;
    const resolvedPartialLayLegs = options?.partialLayLegsOverride ?? partialLayLegs;
    const persistableFormState = getPersistableSportsbookForm(nextFormState, {
      resolvedCommission,
      outcome1Label: multiLayOutcome1Label,
      extraOutcomes: resolvedMultiLayOutcomes,
      partialLayLegs: resolvedPartialLayLegs,
      primaryPlacement: resolvedMultiLayPrimaryPlacement,
    });

    if (!canPersistForm(persistableFormState)) {
      setShowBetSetupValidation(true);
      if (!options?.suppressMissingRequiredMessage) {
        const missingFields = [
          ...getMissingBetSetupFields(persistableFormState),
          ...getMissingPlacementFields(
            persistableFormState,
            resolvedCommission,
            resolvedMultiLayOutcomes
          ),
        ];
        setStatusMessage(
          `Complete required sportsbook fields before saving: ${missingFields.join(", ")}.`
        );
      }
      return;
    }

    const activeRowId = nextFormState.sportsbook_bet_id ?? selectedId;
    const isEditing = Boolean(activeRowId);
    const url = isEditing
      ? `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${activeRowId}`
      : `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`;
    const method = isEditing ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...persistableFormState,
        lay_commission_1: "",
        date_settled: fromDateTimeLocalValue(persistableFormState.date_settled),
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      setErrorMessage(detail);
      return;
    }

    if (persistableFormState !== nextFormState) {
      setFormState(persistableFormState);
    }

    const saved = (await response.json()) as SportsbookRecord;
    setShowBetSetupValidation(false);
    await loadRows(saved.sportsbook_bet_id);
    setSettledEditEnabled(false);
    if (!isEditing && (options?.returnToLedgerOnSuccess ?? !options?.autosaveLabel)) {
      setQuery("");
      setCurrentPage(1);
    }
    if (options?.returnToLedgerOnSuccess ?? !options?.autosaveLabel) {
      setWorkflowVisible(false);
      isCreatingDraftRef.current = false;
      setTableCollapsed(false);
    }
    setStatusMessage(
      options?.autosaveLabel
        ? `${options.autosaveLabel} autosaved for ${saved.sportsbook_bet_id}.`
        : isEditing
          ? `Updated sportsbook bet ${saved.sportsbook_bet_id}.`
          : `Created sportsbook bet ${saved.sportsbook_bet_id}.`
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await persistForm(formState);
  }

  async function applyDropdownChange(
    updater: (current: SportsbookFormState) => SportsbookFormState,
    autosaveLabel: string
  ) {
    const nextFormState = updater(formState);
    setFormState(nextFormState);
    if (!(selectedId ?? formState.sportsbook_bet_id)) {
      return;
    }
    if (!canPersistForm(nextFormState)) {
      return;
    }
    await persistForm(nextFormState, {
      autosaveLabel,
      suppressMissingRequiredMessage: true,
    });
  }

  function handleResetForm() {
    if (selectedSportsbookRow) {
      const nextFormState = recordToForm(selectedSportsbookRow);
      setPreviewCalculation(null);
      const parsedMultiLay = parseMultiLayOutcomes(selectedSportsbookRow.multi_lay_outcomes_json, {
        outcome1Label: selectedSportsbookRow.multi_lay_outcome_1_name,
        layOdds1: selectedSportsbookRow.lay_odds_1,
        exchangeName: selectedSportsbookRow.exchange_name,
        layActual: selectedSportsbookRow.lay_actual,
      });
      setMultiLayOutcomes(parsedMultiLay.extraOutcomes);
      setMultiLayPrimaryPlacement(parsedMultiLay.primaryPlacement);
      setPartialLayLegs(parsePartialLayLegs(selectedSportsbookRow.multi_lay_outcomes_json));
      setMultiLayOutcome1Label(
        getMultiLayOutcomeLabel(selectedSportsbookRow.multi_lay_outcome_1_name)
      );
      setFormState(nextFormState);
      setPristineFormState(nextFormState);
      setShowBetSetupValidation(false);
      setSettledEditEnabled(false);
      setFootballSettlesAssistUsed(false);
      setFootballSettlesOriginalValue(null);
      setErrorMessage("");
      setStatusMessage(
        `Reverted unsaved changes for sportsbook bet ${selectedSportsbookRow.sportsbook_bet_id}.`
      );
      return;
    }

    const blankForm = createBlankForm(defaultBonusRetentionRate);
    setPreviewCalculation(null);
    setMultiLayOutcomes(createDefaultMultiLayOutcomes());
    setMultiLayPrimaryPlacement(createDefaultMultiLayPrimaryPlacementState());
    setPartialLayLegs([]);
    setMultiLayOutcome1Label("");
    setFormState(blankForm);
    setPristineFormState(blankForm);
    setShowBetSetupValidation(false);
    setSettledEditEnabled(false);
    setFootballSettlesAssistUsed(false);
    setFootballSettlesOriginalValue(null);
    setErrorMessage("");
    setStatusMessage("Cleared the unsaved sportsbook bet draft.");
  }

  function applyFootballSettlesAssist() {
    if (!canUseFootballSettlesAssist || footballSettlesAssistUsed) {
      return;
    }

    const nextValue = addMinutesToDateTimeLocalValue(formState.date_settled, 90);
    if (nextValue === formState.date_settled) {
      return;
    }

    setFootballSettlesOriginalValue(formState.date_settled);
    setFootballSettlesAssistUsed(true);
    setFormState((current) => ({
      ...current,
      date_settled: addMinutesToDateTimeLocalValue(current.date_settled, 90),
    }));
    setStatusMessage("Applied football settles helper (+90m). Use Reset if kickoff time changes.");
  }

  function resetFootballSettlesAssist() {
    if (!footballSettlesAssistUsed) {
      return;
    }

    if (footballSettlesOriginalValue !== null) {
      setFormState((current) => ({
        ...current,
        date_settled: footballSettlesOriginalValue,
      }));
    }
    setFootballSettlesAssistUsed(false);
    setFootballSettlesOriginalValue(null);
    setStatusMessage("Football settles helper reset. You can apply +90m again.");
  }

  async function handleDeleteSelectedRow() {
    if (!selectedId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete sportsbook row ${selectedId}? This will remove it from this profile tracker.`
    );
    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${selectedId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const detail = await response.text();
      setErrorMessage(detail || "Unable to delete sportsbook row");
      return;
    }

    await loadRows(null);
    setWorkflowVisible(false);
    isCreatingDraftRef.current = false;
    setStatusMessage(`Deleted sportsbook bet ${selectedId}.`);
  }

  async function updateRowFromTable(
    record: SportsbookRecord,
    overrides: Partial<SportsbookFormState>,
    successMessage: string,
    options?: {
      preserveTableView?: boolean;
    }
  ) {
    setErrorMessage("");
    const response = await fetch(
      `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${record.sportsbook_bet_id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toInlineUpdatePayload(record, overrides)),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      setErrorMessage(detail || "Unable to update sportsbook row");
      return false;
    }

    await loadRows(options?.preserveTableView ? null : record.sportsbook_bet_id);
    if (options?.preserveTableView) {
      setWorkflowVisible(false);
      setTableCollapsed(false);
    }
    setStatusMessage(successMessage);
    return true;
  }

  function openOutcomeModal(record: SportsbookRecord) {
    setOutcomeModalState({
      rowId: record.sportsbook_bet_id,
      status: record.status,
      result: record.result,
      date_settled: toDateTimeLocalValue(record.date_settled),
    });
  }

function openFreeBetBridgeModal(record: SportsbookRecord) {
  const settleDate = toDateTimeLocalValue(record.date_settled);
  setFreeBetBridgeModalState({
    sourceRowId: record.sportsbook_bet_id,
      bookmaker: record.bookmaker,
      offer_type: record.offer_type,
      offer_name: record.offer_name || record.offer_text || "Free bet from sportsbook",
      bet_type: record.bet_type || "Single",
      fixture_type: record.fixture_type || "Football",
    event_name: record.event_name,
    free_bet_value: "5",
    expiry_datetime: settleDate ? addDaysToDateTimeLocalValue(settleDate, 3) : "",
    retention_mode: "SNR",
    award_timing: record.status === "Free Bet Awarded" ? "placement" : "settlement",
  });
}

  async function submitOutcomeModal() {
    if (!outcomeModalState) {
      return;
    }

    const sourceRow = rows.find((row) => row.sportsbook_bet_id === outcomeModalState.rowId);
    if (!sourceRow) {
      setStatusMessage("Sportsbook row could not be found for outcome update.");
      return;
    }

    await updateRowFromTable(
      sourceRow,
      {
        status: outcomeModalState.status,
        result: outcomeModalState.result,
        date_settled: outcomeModalState.date_settled,
      },
      `Updated outcome details for ${sourceRow.sportsbook_bet_id}.`,
      { preserveTableView: true }
    );
    setOutcomeModalState(null);
  }

  async function submitFreeBetBridgeModal() {
    if (!freeBetBridgeModalState) {
      return;
    }

    const sourceRow = rows.find((row) => row.sportsbook_bet_id === freeBetBridgeModalState.sourceRowId);
    if (!sourceRow) {
      setStatusMessage("Sportsbook row could not be found for free-bet bridge.");
      return;
    }

    setErrorMessage("");
    const freeBetStatus =
      freeBetBridgeModalState.award_timing === "placement" ? "Available" : "Not Yet Awarded";

    const freeBetCreateResponse = await fetch(`${apiBaseUrl}/profiles/${profileId}/free-bets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_name: freeBetBridgeModalState.event_name,
        offer_text: sourceRow.offer_text || sourceRow.offer_name || "Free bet from sportsbook",
        bookmaker: freeBetBridgeModalState.bookmaker,
        offer_type: freeBetBridgeModalState.offer_type,
        bet_type: freeBetBridgeModalState.bet_type,
        offer_name: freeBetBridgeModalState.offer_name,
        fixture_type: freeBetBridgeModalState.fixture_type,
        status: freeBetStatus,
        result: "Pending",
        retention_mode: freeBetBridgeModalState.retention_mode,
        free_bet_value: freeBetBridgeModalState.free_bet_value,
        back_odds: "",
        match_strategy: "Standard",
        lay_odds_1: "",
        lay_actual: "",
        lay_matched_stake_1: "",
        lay_commission_1: "",
        exchange_name: "",
        expiry_datetime: fromDateTimeLocalValue(freeBetBridgeModalState.expiry_datetime),
        date_settled: "",
        origin_qual_bet_id: freeBetBridgeModalState.sourceRowId,
        offer_group_id: "",
        user_notes: "",
        manual_override_value: "",
        manual_override_reason: "",
      }),
    });

    if (!freeBetCreateResponse.ok) {
      const detail = await freeBetCreateResponse.text();
      setErrorMessage(detail || "Unable to create free bet from sportsbook row");
      return;
    }

    const createdFreeBet = (await freeBetCreateResponse.json()) as { free_bet_id: string };

    if (
      freeBetBridgeModalState.award_timing === "placement" &&
      sourceRow.status !== "Free Bet Awarded"
    ) {
      const updated = await updateRowFromTable(
        sourceRow,
        {
          status: "Free Bet Awarded",
          result: sourceRow.result,
        },
        `Created free bet ${createdFreeBet.free_bet_id} and marked ${sourceRow.sportsbook_bet_id} as free bet awarded.`,
        { preserveTableView: true }
      );
      if (!updated) {
        return;
      }
    } else {
      await loadRows(null);
      setWorkflowVisible(false);
      setTableCollapsed(false);
      setStatusMessage(
        `Created free bet ${createdFreeBet.free_bet_id} from ${sourceRow.sportsbook_bet_id} and kept the sportsbook row unchanged.`
      );
    }

    setFreeBetBridgeModalState(null);
  }

  async function applySuggestedLayValue(mode: "Standard" | "Underlay" | "Overlay") {
    const nextSuggestedLay =
      mode === "Underlay"
        ? activePreviewCalculation?.reference_lay_stake_underlay ??
          selectedSportsbookRow?.reference_lay_stake_underlay ??
          "—"
        : mode === "Overlay"
          ? activePreviewCalculation?.reference_lay_stake_overlay ??
            selectedSportsbookRow?.reference_lay_stake_overlay ??
            "—"
          : activePreviewCalculation?.reference_lay_stake_standard ??
            selectedSportsbookRow?.reference_lay_stake_standard ??
            "—";

    if (!nextSuggestedLay || nextSuggestedLay === "—") {
      return;
    }

    setFormState((current) => ({
      ...current,
      lay_actual: nextSuggestedLay,
      match_strategy: mode,
    }));

    const copied = await copyToClipboard(nextSuggestedLay);
    setStatusMessage(
      copied
        ? `Applied ${mode.toLowerCase()} suggested lay ${nextSuggestedLay}, switched strategy to ${mode}, and copied it to the clipboard.`
        : `Applied ${mode.toLowerCase()} suggested lay ${nextSuggestedLay} and switched strategy to ${mode}.`
    );
  }

  async function awardFreeBet() {
    const rowId = formState.sportsbook_bet_id ?? selectedId;
    if (!rowId) {
      setStatusMessage("Save this row first before creating a free bet from it.");
      return;
    }

    const sourceRow =
      rows.find((row) => row.sportsbook_bet_id === rowId) ??
      selectedSportsbookRow;
    if (!sourceRow) {
      setStatusMessage("Sportsbook row could not be found for free-bet creation.");
      return;
    }

    openFreeBetBridgeModal(sourceRow);
  }

  async function copyCustomSliderValue() {
    const value = formState.lay_actual.trim();
    if (!value) {
      return;
    }
    const copied = await copyToClipboard(value);
    setStatusMessage(
      copied
        ? `Copied custom lay stake ${value} to clipboard.`
        : `Custom lay stake is ${value}.`
    );
  }

  function applyPlacementAction(action: PlacementAction) {
    if (action !== "back-placed") {
      return;
    }
    const result = applyPlacementActionToState({
      action,
      formState,
      isSettledReadOnly,
      suggestedLayStake: layStakePreview?.suggested ?? "",
    });

    if (result.nextFormState) {
      setFormState(result.nextFormState);
    }

    if (result.statusMessage) {
      setStatusMessage(result.statusMessage);
    }
  }

  function applyPartialLayLegState(nextLegs: PartialLayLegInput[]) {
    setPartialLayLegs(nextLegs);

    if (pendingLegRemovalId && !nextLegs.some((leg) => leg.id === pendingLegRemovalId)) {
      setPendingLegRemovalId(null);
    }

    setFormState((current) => {
      const summary = getPartialLayExecutionSummary({
        explicitTargetLayStake: current.lay_actual,
        suggestedTargetLayStake: layStakePreview?.suggested ?? "",
        legs: nextLegs.map((leg) => ({
          matchedStake: leg.matchedStake,
        })),
      });
      const finalizedSelection = getFinalizedLaySelectionFromPartialLegs(
        nextLegs.map((leg) => ({
          matchedStake: leg.matchedStake,
          exchangeName: leg.exchangeName,
          layOdds: leg.layOdds,
          isFinal: leg.isFinal,
        }))
      );

      return {
        ...current,
        lay_matched_stake_1: summary.matchedTotal > 0 ? formatPreviewMoney(summary.matchedTotal) : "",
        lay_actual: current.lay_actual.trim()
          ? current.lay_actual
          : summary.targetLayStake === null
            ? current.lay_actual
            : formatPreviewMoney(summary.targetLayStake),
        exchange_name:
          finalizedSelection.hasFinalLeg && finalizedSelection.finalLegExchangeName
            ? finalizedSelection.finalLegExchangeName
            : current.exchange_name,
        lay_odds_1:
          finalizedSelection.hasFinalLeg && finalizedSelection.finalLegLayOdds
            ? finalizedSelection.finalLegLayOdds
            : current.lay_odds_1,
      };
    });
  }

  function addPartialLayLeg(options?: { isFinal?: boolean }) {
    if (isSettledReadOnly || isNoLayStrategy) {
      return;
    }

    if (options?.isFinal && partialLayLegs.some((leg) => leg.isFinal)) {
      setStatusMessage("A final lay leg already exists. Update or remove it before adding another.");
      return;
    }

    const existingSummary = getPartialLayExecutionSummary({
      explicitTargetLayStake: formState.lay_actual,
      suggestedTargetLayStake: layStakePreview?.suggested ?? "",
      legs: partialLayLegs.map((leg) => ({
        matchedStake: leg.matchedStake,
      })),
    });

    const legIndex = partialLayLegs.length + 1;
    const nextLeg: PartialLayLegInput = {
      id: createPartialLayLegId(legIndex),
      exchangeName: formState.exchange_name,
      layOdds: formState.lay_odds_1,
      matchedStake:
        options?.isFinal && existingSummary.nextRecommendedStake !== null
          ? formatPreviewMoney(existingSummary.nextRecommendedStake)
          : "",
      isFinal: Boolean(options?.isFinal),
    };

    setFormState((current) => ({
      ...current,
      status: "Placed",
      result: "Pending",
    }));
    setPendingLegRemovalId(null);
    applyPartialLayLegState([...partialLayLegs, nextLeg]);
    setStatusMessage(
      options?.isFinal
        ? "Added a final lay leg. Exchange and lay odds can be adjusted, and the matched stake is prefilled from remaining target."
        : "Added a partially matched lay leg. Enter exchange, lay odds, and matched stake."
    );
  }

  function updatePartialLayLeg(
    legId: string,
    field: "exchangeName" | "layOdds" | "matchedStake",
    value: string
  ) {
    setPendingLegRemovalId((current) => (current === legId ? null : current));
    applyPartialLayLegState(
      partialLayLegs.map((leg) => (leg.id === legId ? { ...leg, [field]: value } : leg))
    );
  }

  function requestRemovePartialLayLeg(legId: string) {
    setPendingLegRemovalId((current) => (current === legId ? null : legId));
  }

  function confirmRemovePartialLayLeg(legId: string) {
    const removalIndex = partialLayLegs.findIndex((leg) => leg.id === legId);
    if (removalIndex < 0) {
      return;
    }

    const removedLeg = partialLayLegs[removalIndex];
    setLastRemovedPartialLayLeg({
      leg: removedLeg,
      index: removalIndex,
    });
    setPendingLegRemovalId(null);
    applyPartialLayLegState(partialLayLegs.filter((leg) => leg.id !== legId));
    setStatusMessage("Removed lay leg. Undo is available if this was a mistake.");
  }

  function undoRemovePartialLayLeg() {
    if (!lastRemovedPartialLayLeg) {
      return;
    }

    const restoreIndex = Math.min(lastRemovedPartialLayLeg.index, partialLayLegs.length);
    const nextLegs = [...partialLayLegs];
    nextLegs.splice(restoreIndex, 0, lastRemovedPartialLayLeg.leg);
    applyPartialLayLegState(nextLegs);
    setLastRemovedPartialLayLeg(null);
    setPendingLegRemovalId(null);
    setStatusMessage("Undo complete. Removed lay leg restored.");
  }

  async function copyRecommendedNextLayStake() {
    if (!canCopyRecommendedNextLayStake || recommendedNextLayStakeValue === null) {
      return;
    }

    const nextStake = formatPreviewMoney(recommendedNextLayStakeValue);
    const copied = await copyToClipboard(nextStake);
    const finalLegIndex = partialLayLegs.findIndex((leg) => leg.isFinal);

    const nextLegs =
      finalLegIndex >= 0
        ? partialLayLegs.map((leg, index) =>
            index === finalLegIndex ? { ...leg, matchedStake: nextStake } : leg
          )
        : [
            ...partialLayLegs,
            {
              id: createPartialLayLegId(partialLayLegs.length + 1),
              exchangeName: formState.exchange_name,
              layOdds: formState.lay_odds_1,
              matchedStake: nextStake,
              isFinal: false,
            },
          ];

    applyPartialLayLegState(nextLegs);
    setPendingLegRemovalId(null);
    setStatusMessage(
      copied
        ? "Copied Recommended Next Lay Stake and applied it to the next lay leg matched stake."
        : "Applied Recommended Next Lay Stake to the next lay leg matched stake."
    );
  }

  function updateMultiLayPlacementField(
    branchKey: string,
    field: keyof Pick<
      MultiLayOutcomeInput,
      "placedExchange" | "placedLayOdds" | "placedMatchedStake" | "placementState"
    >,
    value: string
  ) {
    if (branchKey === "outcome1") {
      setMultiLayPrimaryPlacement((current) => ({
        ...current,
        [field]: value,
      }));
      return;
    }

    setMultiLayOutcomes((current) =>
      current.map((outcome) =>
        outcome.id === branchKey ? { ...outcome, [field]: value } : outcome
      )
    );
  }

  async function removeMultiLayPlacement(branchKey: string) {
    if (branchKey === "outcome1") {
      const nextPrimaryPlacement = {
        ...createDefaultMultiLayPrimaryPlacementState(),
        placedExchange: formState.exchange_name,
        placedLayOdds: formState.lay_odds_1,
      };
      setMultiLayPrimaryPlacement(nextPrimaryPlacement);
      await persistForm(
        {
          ...formState,
          status: "Placed",
          result: "Pending",
        },
        {
          autosaveLabel: "Removed multi-lay placement",
          suppressMissingRequiredMessage: true,
          multiLayPrimaryPlacementOverride: nextPrimaryPlacement,
        }
      );
      return;
    }

    const nextOutcomes = multiLayOutcomes.map((outcome) =>
      outcome.id === branchKey
        ? {
            ...outcome,
            placedExchange: "",
            placedLayOdds: outcome.layOdds,
            placedMatchedStake: "",
            placementState: "pending" as const,
          }
        : outcome
    );
    setMultiLayOutcomes(nextOutcomes);
    await persistForm(
      {
        ...formState,
        status: "Placed",
        result: "Pending",
      },
      {
        autosaveLabel: "Removed multi-lay placement",
        suppressMissingRequiredMessage: true,
        multiLayOutcomesOverride: nextOutcomes,
      }
    );
  }

  async function copyMultiLayStake(leg: MultiLayPlannerLeg) {
    const effectiveStake = getEffectiveMultiLayStakeForLeg(formState.match_strategy, leg);
    const copied = await copyToClipboard(effectiveStake);
    const nextFormState = {
      ...formState,
      status: "Placed",
      result: "Pending",
    };

    if (leg.key === "outcome1") {
      const nextPrimaryPlacement: MultiLayPrimaryPlacementState = {
        placedExchange: formState.exchange_name,
        placedLayOdds: formState.lay_odds_1,
        placedMatchedStake: effectiveStake,
        placementState: "placed",
      };
      setMultiLayPrimaryPlacement(nextPrimaryPlacement);
      setFormState((current) => ({
        ...current,
        status: "Placed",
        result: "Pending",
        lay_actual: effectiveStake,
        lay_matched_stake_1: effectiveStake,
      }));
      await persistForm(
        {
          ...nextFormState,
          lay_actual: effectiveStake,
          lay_matched_stake_1: effectiveStake,
        },
        {
          autosaveLabel: copied
            ? `Copied ${leg.label} lay ${effectiveStake} and marked it placed`
            : `Prepared ${leg.label} lay ${effectiveStake} and marked it placed`,
          suppressMissingRequiredMessage: true,
          multiLayPrimaryPlacementOverride: nextPrimaryPlacement,
        }
      );
      return;
    }

    const nextOutcomes = multiLayOutcomes.map((outcome) =>
      outcome.id === leg.key
        ? {
            ...outcome,
            standardLayStake: leg.standardLay,
            underlayStake: leg.underlayLay,
            liability: leg.liability,
            placedExchange: formState.exchange_name,
            placedLayOdds: outcome.layOdds,
            placedMatchedStake: effectiveStake,
            placementState: "placed" as const,
          }
        : outcome
    );
    setMultiLayOutcomes(nextOutcomes);
    setFormState(nextFormState);
    await persistForm(nextFormState, {
      autosaveLabel: copied
        ? `Copied ${leg.label} lay ${effectiveStake} and marked it placed`
        : `Prepared ${leg.label} lay ${effectiveStake} and marked it placed`,
      suppressMissingRequiredMessage: true,
      multiLayOutcomesOverride: nextOutcomes,
    });
  }

  function addMultiLayOutcome() {
    setMultiLayOutcomes((current) => {
      const nextIndex = current.length + 2;
      return [
        ...current,
        {
          id: createMultiLayOutcomeId(nextIndex),
          label: "",
          layOdds: "",
        },
      ];
    });
  }

  function removeMultiLayOutcome(outcomeId: string) {
    setMultiLayOutcomes((current) => {
      if (current.length <= 1) {
        return current;
      }
      return current.filter((entry) => entry.id !== outcomeId);
    });
  }

  function renderTableCell(row: TrackerRow, column: TableColumn) {
    const rowId = String(row.sportsbook_bet_id ?? "");
    const sourceRow = sportsbookRowsById.get(rowId);
    const value = String(row[column.key] ?? "").trim() || "—";

    if (column.key === "bookmaker") {
      return (
        <BookmakerIdentity
          bookmaker={value}
          catalogue={bookmakerCatalogue}
          mode={bookmakerDisplaySettings?.resolved_mode}
        />
      );
    }

    if (
      column.key === "match_strategy" ||
      column.key === "lay_status" ||
      column.key === "back_bet_status" ||
      column.key === "status" ||
      column.key === "offer_details"
    ) {
      if (column.key === "match_strategy") {
        return (
          <span className={`table-chip${getStrategyToneClass(value)}`}>
            {getCompactSportsbookLabel(value)}
          </span>
        );
      }

      if (column.key === "lay_status") {
        const normalizedLayStatus = value.toLowerCase();
        let layStatusToneClass = "";
        let layStatusLabel = value;

        if (normalizedLayStatus.includes("not laid")) {
          layStatusToneClass = " table-chip-muted";
          layStatusLabel = "Not Laid";
        } else if (normalizedLayStatus.includes("partially")) {
          layStatusToneClass = " table-chip-lay-partial";
          layStatusLabel = "Part Laid";
        } else if (normalizedLayStatus.includes("part laid")) {
          layStatusToneClass = " table-chip-lay-partial";
          layStatusLabel = "Part Laid";
        } else if (normalizedLayStatus.includes("fully")) {
          layStatusToneClass = " table-chip-back-placed";
          layStatusLabel = "Fully Laid";
        }

        return <span className={`table-chip${layStatusToneClass}`}>{layStatusLabel}</span>;
      }

      if (column.key === "back_bet_status" && sourceRow) {
        const backBetStatus = getSportsbookBackBetStatusBadge(sourceRow);
        const backBetToneClass =
          backBetStatus.tone === "positive"
            ? " table-chip-back-placed"
            : backBetStatus.tone === "muted"
              ? " table-chip-muted"
              : " table-chip-warning";

        return <span className={`table-chip${backBetToneClass}`}>{backBetStatus.label}</span>;
      }

      if (column.key === "status" && sourceRow) {
        const normalizedStatus = value.toLowerCase();
        const statusToneClass =
          normalizedStatus.includes("prospecting") || normalizedStatus.includes("not placed")
            ? " table-chip-muted"
            : normalizedStatus.includes("free bet awarded")
              ? " table-chip-status-awarded"
              : normalizedStatus.includes("settled")
                ? " table-chip-status-settled"
              : normalizedStatus.includes("placed")
                ? " table-chip-status-placed"
                : "";

        return <span className={`table-chip${statusToneClass}`}>{value}</span>;
      }

      if (column.key === "offer_details" && sourceRow) {
        const detailTokens = getOfferDetailsTokens(sourceRow);

        return (
          <span className="table-chip-stack table-chip-stack-centered">
            {detailTokens.length > 0 ? (
              detailTokens.map((token) => (
                <span className="table-chip" key={token}>
                  {token}
                </span>
              ))
            ) : (
              <span className="table-status">—</span>
            )}
          </span>
        );
      }

      return <span className="table-chip">{value}</span>;
    }

    if (column.key === "actions" && sourceRow) {
      return (
        <div
          className="table-action-row"
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <button
            aria-label={`Update outcome for ${sourceRow.sportsbook_bet_id}`}
            className="icon-button table-action-button"
            onClick={() => openOutcomeModal(sourceRow)}
            type="button"
          >
            <span aria-hidden="true">🏁</span>
          </button>
          {isFreeBetAwardingOffer(sourceRow.offer_type) ? (
            <button
              aria-label={`Copy ${sourceRow.sportsbook_bet_id} to free bets`}
              className="icon-button table-action-button"
              onClick={() => openFreeBetBridgeModal(sourceRow)}
              type="button"
            >
              <span aria-hidden="true">💰+</span>
            </button>
          ) : (
            <span aria-hidden="true" className="table-action-button table-action-button-placeholder" />
          )}
        </div>
      );
    }

    if (column.key === "displayed_value") {
      const label = String(row.displayed_value_label ?? "Value");
      return (
        <span className="table-value-cell">
          <strong>{value}</strong>
          <span>{label}</span>
        </span>
      );
    }

    return (
      <span className="table-cell-text">
        {value}
      </span>
    );
  }

  return (
    <section className="stack">
      <StatusToast message={statusMessage} onDismiss={clearStatusMessage} />
      <section
        aria-busy={isInitialLoading}
        className="content-panel stack sportsbook-page-shell"
      >
        <div className="sportsbook-page-header">
          <h1 className="sportsbook-page-title">Sportsbook Bets</h1>
          <div className="tracker-nav">
            <button className="button-link" onClick={startNewRow} type="button">
              Add sportsbook row
            </button>
            <button
              aria-label={tableCollapsed ? "Expand ledger" : "Collapse ledger"}
              className="icon-button ledger-collapse-button"
              onClick={() => setTableCollapsed((current) => !current)}
              title={tableCollapsed ? "Expand ledger" : "Collapse ledger"}
              type="button"
            >
              {tableCollapsed ? "+" : "-"}
            </button>
          </div>
        </div>
        {isInitialLoading ? (
          <LedgerLoadingIndicator label="Loading sportsbook ledger" />
        ) : null}
        <div className="sportsbook-review-bar" aria-label="Sportsbook review filters">
          <label className="field-control table-search-field">
            <span>Search</span>
            <input
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search sportsbook rows"
              type="search"
              value={query}
            />
          </label>
          <div className="table-filter-button-wrap">
            <button
              aria-label="Open sportsbook filter and column controls"
              className={`icon-button table-filter-button${hasActiveTableControls ? " has-active-table-controls" : ""}`}
              onClick={() => setIsFilterModalOpen(true)}
              title="Filter and columns"
              type="button"
            >
              <svg
                aria-hidden="true"
                fill="none"
                className="table-filter-icon"
                viewBox="0 0 24 24"
              >
                <path
                  d="M4 6h16l-6.5 7.3v4.9l-3 1.8v-6.7L4 6Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
              {hasActiveTableControls ? (
                <span aria-label={`${activeTableControlCount} active table controls`} className="table-filter-badge">
                  {activeTableControlCount > 9 ? "9+" : activeTableControlCount}
                </span>
              ) : null}
            </button>
            {hasActiveTableControls ? (
              <button
                aria-label="Clear active sportsbook filters and hidden-column states"
                className="table-filter-clear"
                onClick={() => {
                  clearTableFilters();
                  setVisibleColumnKeys(new Set(defaultVisibleSportsbookColumns));
                }}
                type="button"
              >
                ×
              </button>
            ) : null}
          </div>
        </div>
        <section className="stat-strip" aria-label="Sportsbook quick view">
          <article className="stat-card">
            <span className="eyebrow">Open / overdue</span>
            <strong>
              {quickView.openCount} / {quickView.overdueCount}
            </strong>
            <span>Open rows • Overdue rows</span>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Placed / prospecting</span>
            <strong>
              {quickView.placedCount} / {quickView.placeholderCount}
            </strong>
            <span>Placed rows • Prospecting + Not placed rows</span>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Underlays / no lay</span>
            <strong>
              {quickView.underlayCount} / {quickView.noLayCount}
            </strong>
            <span>Underlay rows • No-lay rows</span>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Settling date set</span>
            <strong>{quickView.settlingCount}</strong>
            <span>Rows with a settle datetime</span>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Resolved value</span>
            <strong>{formatCurrencyValue(quickView.totalReportingValue)}</strong>
            <span>Current ledger total</span>
          </article>
        </section>
        {errorMessage ? (
          <p className="error-text" role="alert">
            {errorMessage}
          </p>
        ) : null}
        {!tableCollapsed ? (
          <>
            <div className="table-scroll">
              <table className="data-table sportsbook-data-table">
                <colgroup>
                  {tableColumns.map((column) => {
                    const key = column.key as SportsbookColumnKey;
                    const width = columnWidths[key] ?? defaultSportsbookColumnWidths[key];
                    return <col key={column.key} style={{ width: `${width}px` }} />;
                  })}
                </colgroup>
                <thead>
                  <tr>
                    {tableColumns.map((column) => (
                      (() => {
                        const sortable = isSortableSportsbookColumn(column.key);
                        const sortableKey = sortable ? (column.key as SportsbookSortKey) : null;
                        const isActiveSort = sortable && tableSort?.key === column.key;
                        const sortDirection = isActiveSort ? tableSort?.direction : null;
                        const sortMarker =
                          sortDirection === "asc"
                            ? "▲"
                            : sortDirection === "desc"
                              ? "▼"
                              : "↕";
                        const sortLabel =
                          sortDirection === "asc"
                            ? "ascending"
                            : sortDirection === "desc"
                              ? "descending"
                              : "none";

                        return (
                          <th
                            aria-sort={sortable ? sortLabel : undefined}
                            className="align-center"
                            data-column-key={column.key}
                            key={column.key}
                            scope="col"
                          >
                            <div className="table-header-cell">
                              {sortable ? (
                                <button
                                  className={`table-sort-button${isActiveSort ? " is-active" : ""}`}
                                  onClick={() => {
                                    if (sortableKey) {
                                      toggleTableSort(sortableKey);
                                    }
                                  }}
                                  type="button"
                                >
                                  <span>{column.label}</span>
                                  <span aria-hidden="true">{sortMarker}</span>
                                </button>
                              ) : (
                                <span className="table-header-label">{column.label}</span>
                              )}
                              <span
                                aria-hidden="true"
                                className="table-column-resize-handle"
                                onDoubleClick={(event) => {
                                  event.stopPropagation();
                                  const headerCell = event.currentTarget.closest("th");
                                  const tableElement = event.currentTarget.closest("table");
                                  autosizeColumn(
                                    column.key as SportsbookColumnKey,
                                    headerCell,
                                    tableElement
                                  );
                                }}
                                onMouseDown={(event) => {
                                  const headerCell = event.currentTarget.closest("th");
                                  startColumnResize(
                                    event,
                                    column.key as SportsbookColumnKey,
                                    headerCell
                                  );
                                }}
                              />
                            </div>
                          </th>
                        );
                      })()
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length === 0 ? (
                    <tr>
                      <td className="empty-cell" colSpan={tableColumns.length}>
                        No sportsbook rows match the current filter.
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((row, index) => {
                      const rowId = String(row.sportsbook_bet_id);
                      const isSelected = selectedId === rowId;
                      const sourceRow = sportsbookRowsById.get(rowId);
                      const rowStateClassName = sourceRow
                        ? getSportsbookRowStateClassName(sourceRow)
                        : "";
                      const rowIssueBadges = sourceRow
                        ? sortIssueBadgesByPriority(getSportsbookIssueBadges(sourceRow))
                        : [];
                      return (
                        <tr
                          className={[isSelected ? "is-selected-row" : "", rowStateClassName]
                            .filter(Boolean)
                            .join(" ") || undefined}
                          key={`${rowId}-${index}`}
                          onClick={() => selectRow(rowId)}
                          onDoubleClick={() => selectRow(rowId, { collapseTable: true })}
                        >
                          {tableColumns.map((column) => (
                            <td
                              className={
                                column.key === "actions"
                                  ? "align-center"
                                  : column.key === "displayed_value"
                                    ? "align-center"
                                    : "align-center"
                              }
                              key={column.key}
                            >
                              {column.key === "date_settled" && rowIssueBadges.length > 0 ? (
                                <div className="row-issue-overlay" aria-hidden="true">
                                  {rowIssueBadges.map((badge) => (
                                    <span
                                      className={`table-chip${
                                        badge.tone === "danger"
                                          ? " table-chip-warning"
                                          : " table-chip-lay-partial"
                                      }`}
                                      key={badge.label}
                                    >
                                      {badge.label}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                              {renderTableCell(row, column)}
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="table-pagination" aria-label="Sportsbook pagination">
              <div className="table-status">Page {effectivePage} of {pageCount}</div>
              <div className="tracker-nav">
                <button
                  className="button-link"
                  disabled={effectivePage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  type="button"
                >
                  Previous
                </button>
                <button
                  className="button-link"
                  disabled={effectivePage === pageCount}
                  onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : null}
      </section>

      {isFilterModalOpen ? (
        <div className="modal-backdrop" onClick={() => setIsFilterModalOpen(false)}>
          <section
            aria-label="Sportsbook filter controls"
            className="modal-panel stack"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="workflow-panel-header">
              <div className="stack">
                <span className="eyebrow">Table controls</span>
                <strong>Filter sportsbook rows</strong>
              </div>
              <button
                aria-label="Close sportsbook filter controls"
                className="modal-close-button"
                onClick={() => setIsFilterModalOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="form-grid">
              <label className="field-control">
                <span>View</span>
                <select
                  aria-label="Sportsbook review mode"
                  onChange={(event) => {
                    setTableMode(event.target.value as SportsbookTableMode);
                    setCurrentPage(1);
                  }}
                  value={tableMode}
                >
                  {sportsbookTableModes.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Bookmaker</span>
                <select
                  onChange={(event) => updateTableFilter("bookmaker", event.target.value)}
                  value={tableFilters.bookmaker}
                >
                  <option value="">All</option>
                  {sportsbookFilterOptions.bookmakers.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Offer type (promotion mechanism)</span>
                <select
                  disabled={!offerDetailsColumnVisible}
                  onChange={(event) => updateTableFilter("offer_type", event.target.value)}
                  value={tableFilters.offer_type}
                >
                  <option value="">All</option>
                  {sportsbookFilterOptions.offerTypes.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Fixture type</span>
                <select
                  disabled={!offerDetailsColumnVisible}
                  onChange={(event) => updateTableFilter("fixture_type", event.target.value)}
                  value={tableFilters.fixture_type}
                >
                  <option value="">All</option>
                  {sportsbookFilterOptions.fixtureTypes.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Bet type</span>
                <select
                  disabled={!offerDetailsColumnVisible}
                  onChange={(event) => updateTableFilter("bet_type", event.target.value)}
                  value={tableFilters.bet_type}
                >
                  <option value="">All</option>
                  {sportsbookFilterOptions.betTypes.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Strategy</span>
                <select
                  disabled={!strategyColumnVisible}
                  onChange={(event) => updateTableFilter("match_strategy", event.target.value)}
                  value={tableFilters.match_strategy}
                >
                  <option value="">All</option>
                  {sportsbookFilterOptions.strategies.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Lay bet</span>
                <select
                  onChange={(event) => updateTableFilter("lay_status", event.target.value)}
                  value={tableFilters.lay_status}
                >
                  <option value="">All</option>
                  {sportsbookFilterOptions.layStatuses.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Back bet</span>
                <select
                  onChange={(event) => updateTableFilter("back_bet_status", event.target.value)}
                  value={tableFilters.back_bet_status}
                >
                  <option value="">All</option>
                  {sportsbookFilterOptions.backBetStatuses.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Status</span>
                <select
                  onChange={(event) => updateTableFilter("status", event.target.value)}
                  value={tableFilters.status}
                >
                  <option value="">All</option>
                  {sportsbookFilterOptions.statuses.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Issue type</span>
                <select
                  onChange={(event) =>
                    updateTableFilter("issue_type", event.target.value as SportsbookIssueFilter)
                  }
                  value={tableFilters.issue_type}
                >
                  <option value="any">All</option>
                  <option value="back-unplaced">Back Unplaced</option>
                  <option value="no-settle-date">No Settle Date</option>
                  <option value="outcome-needed">Outcome Needed</option>
                </select>
              </label>
              <label className="field-control">
                <span>Value min</span>
                <input
                  inputMode="decimal"
                  onChange={(event) => updateTableFilter("min_value", event.target.value)}
                  placeholder="0"
                  value={tableFilters.min_value}
                />
              </label>
              <label className="field-control">
                <span>Value max</span>
                <input
                  inputMode="decimal"
                  onChange={(event) => updateTableFilter("max_value", event.target.value)}
                  placeholder="0"
                  value={tableFilters.max_value}
                />
              </label>
            </div>
            <section className="stack">
              <strong>Visible columns</strong>
              <div className="review-chip-row">
                {sportsbookTableColumns.map((column) => {
                  const key = column.key as SportsbookColumnKey;
                  const hideable = columnHideableKeys.has(key);
                  const isVisible = visibleColumnKeys.has(key);

                  if (!hideable) {
                    return (
                      <span className="review-chip review-chip-state-muted" key={key}>
                        {column.label}
                      </span>
                    );
                  }

                  return (
                    <button
                      aria-pressed={isVisible}
                      className={`review-chip${
                        isVisible ? " review-chip-action-positive" : " review-chip-action-negative"
                      }`}
                      key={key}
                      onClick={() => toggleColumnVisibility(key)}
                      type="button"
                    >
                      {isVisible ? `Hide ${column.label}` : `${column.label} hidden`}
                    </button>
                  );
                })}
              </div>
            </section>
            <div className="tracker-nav">
              <button className="button-link" onClick={clearTableFilters} type="button">
                Clear filters
              </button>
              <button className="modal-primary-button" onClick={() => setIsFilterModalOpen(false)} type="button">
                Done
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {outcomeModalState ? (
        <div className="modal-backdrop" onClick={() => setOutcomeModalState(null)}>
          <section
            aria-label="Update sportsbook outcome"
            className="modal-panel stack"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="workflow-panel-header">
              <div className="stack">
                <span className="eyebrow">Outcome action</span>
                <strong>Update settlement and outcome</strong>
              </div>
              <button
                aria-label="Close outcome modal"
                className="modal-close-button"
                onClick={() => setOutcomeModalState(null)}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="form-grid">
              <label className="field-control">
                <span>Status</span>
                <select
                  onChange={(event) =>
                    setOutcomeModalState((current) =>
                      current ? applyOutcomeModalStatusDefaults(current, event.target.value) : current
                    )
                  }
                  value={outcomeModalState.status}
                >
                  {sportsbookStatusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Outcome</span>
                <select
                  onChange={(event) =>
                    setOutcomeModalState((current) =>
                      current ? applyOutcomeModalResultDefaults(current, event.target.value) : current
                    )
                  }
                  value={outcomeModalState.result}
                >
                  {(rows.find((row) => row.sportsbook_bet_id === outcomeModalState.rowId)
                    ? getSportsbookResultOptions(
                        rows.find((row) => row.sportsbook_bet_id === outcomeModalState.rowId)?.offer_type ?? "",
                        rows.find((row) => row.sportsbook_bet_id === outcomeModalState.rowId)?.match_strategy ?? "",
                        rows.find((row) => row.sportsbook_bet_id === outcomeModalState.rowId)?.bonus_trigger ?? ""
                      )
                    : sportsbookResultOptions.map((option) => ({ value: option, label: option }))).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control field-span-2">
                <span>Settles</span>
                <input
                  onChange={(event) =>
                    setOutcomeModalState((current) =>
                      current ? { ...current, date_settled: event.target.value } : current
                    )
                  }
                  type="datetime-local"
                  value={outcomeModalState.date_settled}
                />
              </label>
            </div>
            <div className="tracker-nav">
              <button className="button-link" onClick={() => setOutcomeModalState(null)} type="button">
                Close
              </button>
              <button className="modal-primary-button" onClick={() => void submitOutcomeModal()} type="button">
                Save
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {freeBetBridgeModalState ? (
        <div
          className="modal-backdrop modal-backdrop-elevated"
          onClick={() => setFreeBetBridgeModalState(null)}
        >
          <section
            aria-label="Copy sportsbook row to free bets"
            className="modal-panel stack"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="workflow-panel-header">
              <div className="stack">
                <span className="eyebrow">Free-bet bridge</span>
                <strong>Copy to free bets</strong>
              </div>
              <button
                aria-label="Close free-bet bridge modal"
                className="modal-close-button"
                onClick={() => setFreeBetBridgeModalState(null)}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="form-grid">
              <label className="field-control">
                <span>Bookmaker</span>
                <select
                  onChange={(event) =>
                    setFreeBetBridgeModalState((current) =>
                      current ? { ...current, bookmaker: event.target.value } : current
                    )
                  }
                  value={freeBetBridgeModalState.bookmaker}
                >
                  {bookmakerOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Campaign tag (optional)</span>
                <select
                  onChange={(event) =>
                    setFreeBetBridgeModalState((current) =>
                      current ? { ...current, offer_name: event.target.value } : current
                    )
                  }
                  value={freeBetBridgeModalState.offer_name}
                >
                  <option value="">Select campaign tag (optional)</option>
                  {freeBetBridgeCampaignTagOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Bet type (bet shape / placement)</span>
                <select
                  onChange={(event) =>
                    setFreeBetBridgeModalState((current) =>
                      current ? { ...current, bet_type: event.target.value } : current
                    )
                  }
                  value={freeBetBridgeModalState.bet_type}
                >
                  {freeBetBridgeBetTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Fixture type</span>
                <select
                  onChange={(event) =>
                    setFreeBetBridgeModalState((current) =>
                      current ? { ...current, fixture_type: event.target.value } : current
                    )
                  }
                  value={freeBetBridgeModalState.fixture_type}
                >
                  {fixtureTypeOptionsResolved.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control field-span-2">
                <span>Event</span>
                <input
                  onChange={(event) =>
                    setFreeBetBridgeModalState((current) =>
                      current ? { ...current, event_name: event.target.value } : current
                    )
                  }
                  value={freeBetBridgeModalState.event_name}
                />
              </label>
              <label className="field-control">
                <span>Free-bet value</span>
                <input
                  onChange={(event) =>
                    setFreeBetBridgeModalState((current) =>
                      current ? { ...current, free_bet_value: event.target.value } : current
                    )
                  }
                  value={freeBetBridgeModalState.free_bet_value}
                />
              </label>
              <label className="field-control">
                <span>Expiry</span>
                <input
                  onChange={(event) =>
                    setFreeBetBridgeModalState((current) =>
                      current ? { ...current, expiry_datetime: event.target.value } : current
                    )
                  }
                  type="datetime-local"
                  value={freeBetBridgeModalState.expiry_datetime}
                />
              </label>
              <label className="field-control">
                <span>Retention mode</span>
                <select
                  onChange={(event) =>
                    setFreeBetBridgeModalState((current) =>
                      current ? { ...current, retention_mode: event.target.value } : current
                    )
                  }
                  value={freeBetBridgeModalState.retention_mode}
                >
                  {freeBetRetentionModeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Free-bet award timing</span>
                <select
                  onChange={(event) =>
                    setFreeBetBridgeModalState((current) =>
                      current
                        ? {
                            ...current,
                            award_timing:
                              event.target.value === "placement" ? "placement" : "settlement",
                          }
                        : current
                    )
                  }
                  value={freeBetBridgeModalState.award_timing}
                >
                  <option value="settlement">Award after settlement</option>
                  <option value="placement">Award on placement</option>
                </select>
              </label>
            </div>
            <div className="tracker-nav">
              <button className="button-link" onClick={() => setFreeBetBridgeModalState(null)} type="button">
                Close
              </button>
              <button className="modal-primary-button" onClick={submitFreeBetBridgeModal} type="button">
                Create free bet
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {workflowVisible ? (
        <div className="modal-backdrop" onClick={closeEditor}>
          <section
            aria-label={selectedId ? "Edit sportsbook row" : "Create sportsbook row"}
            className="content-panel stack workflow-editor-panel modal-panel workflow-editor-modal"
            onClick={(event) => event.stopPropagation()}
            ref={editorRef}
            role="dialog"
          >
            <div className="workflow-panel-header">
              <div className="stack">
                <span className="eyebrow">
                  {selectedId ? "Edit sportsbook row" : "Create sportsbook row"}
                </span>
                <strong className="workflow-header-title" title={editorHeaderFullTitle}>{editorHeaderTitle}</strong>
              </div>
              <div className="tracker-nav">
                {isSettledReadOnly ? (
                  <button
                    className="button-link"
                    onClick={() => setSettledEditEnabled(true)}
                    type="button"
                  >
                    Edit settled row
                  </button>
                ) : null}
                <button className="button-link" onClick={closeEditor} type="button">
                  Close
                </button>
              </div>
            </div>
          {showCalculationSummary ? (
            <section className="stat-strip" aria-label="Sportsbook editor overview">
              <article className="stat-card">
                <span className="eyebrow">
                  {getDisplayedValueLabel(activePreviewCalculation, selectedSportsbookRow)}
                </span>
                <strong>{getDisplayedValue(activePreviewCalculation, selectedSportsbookRow)}</strong>
                <span>Status: {formState.status || "—"}</span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Settles</span>
                <strong>{settlesDisplay}</strong>
                <span>
                  {formState.result || "Pending"}
                  {settlesCountdownDisplay ? ` • ${settlesCountdownDisplay}` : ""}
                </span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Lay and matching</span>
                <strong>
                  {usesMultiLayStrategy
                    ? `Multi Lay • ${formState.match_strategy === "Multilay-Underlay" ? "Underlay on" : "Underlay off"}`
                    : formState.match_strategy || "—"}
                </strong>
                <span>
                  Lay status: {activePreviewCalculation?.lay_status ?? selectedSportsbookRow?.lay_status ?? "—"}
                </span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Offer path</span>
                <strong>{formState.offer_type || "Offer type pending"}</strong>
                <span>
                  {offerTypeDescriptor
                    ? `${offerTypeDescriptor.calculatorFamily} • ${offerTypeDescriptor.summary}`
                    : [formState.bookmaker, formState.fixture_type].filter(Boolean).join(" • ") || "—"}
                </span>
              </article>
            </section>
          ) : null}
          <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
            <EditorSection
              headerAside={
                isSettledReadOnly ? <span className="section-lock-chip">Settled row locked</span> : null
              }
              invalid={betSetupValidationActive && missingBetSetupFields.length > 0}
              title="Bet setup"
            >
              {betSetupValidationActive && missingBetSetupFields.length > 0 ? (
                <p className="field-validation-text" role="alert">
                  Complete the required Bet setup fields before saving this sportsbook row:{" "}
                  {missingBetSetupFields.join(", ")}.
                </p>
              ) : null}
              <fieldset className="section-fieldset" disabled={isSettledReadOnly}>
              <div className="form-grid">
                <label className="field-control">
                  <span>Offer</span>
                  <input
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, offer_text: event.target.value }))
                    }
                    value={formState.offer_text}
                  />
                </label>
                <label
                  className={`field-control${
                    betSetupValidationActive && !formState.bookmaker.trim() ? " is-invalid" : ""
                  }`}
                >
                  <span>Bookmaker</span>
                  <select
                    aria-invalid={betSetupValidationActive && !formState.bookmaker.trim()}
                    onChange={(event) =>
                      void applyDropdownChange(
                        (current) => ({ ...current, bookmaker: event.target.value }),
                        "Bookmaker change"
                      )
                    }
                    value={formState.bookmaker}
                  >
                    <option value="">Select bookmaker</option>
                    {bookmakerOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                {specialOfferBookmakerSuggestion ? (
                  <div className="field-span-2 special-offer-suggestion-panel">
                    <div className="section-heading-row">
                      <div className="stack stack-tight">
                        <span className="eyebrow">Known bookmaker coverage</span>
                        <span className="field-help-text">
                          Matched from{" "}
                          {specialOfferBookmakerSuggestion.resolutionSource === "campaign_tag"
                            ? "campaign tag"
                            : specialOfferBookmakerSuggestion.resolutionSource === "offer"
                              ? "offer"
                              : "offer family"}
                          .
                        </span>
                      </div>
                      <span className="table-chip">
                        {getCompactSportsbookLabel(specialOfferBookmakerSuggestion.resolvedOfferKey)}
                      </span>
                    </div>
                    <div className="review-chip-row" aria-label="Known bookmaker coverage summary">
                      <span className="review-chip review-chip-action-positive">
                        Available {specialOfferBookmakerSuggestion.availableBookmakers.length}
                      </span>
                      <span className="review-chip review-chip-state-unavailable">
                        Unavailable {specialOfferBookmakerSuggestion.unavailableBookmakers.length}
                      </span>
                      <span className="review-chip review-chip-state-muted">
                        Missing {specialOfferBookmakerSuggestion.missingKnownBookmakers.length}
                      </span>
                    </div>
                    <div
                      className="special-offer-suggestion-groups"
                      aria-label="Known bookmakers for this offer"
                      role="group"
                    >
                      {specialOfferBookmakerSuggestion.availableBookmakers.length > 0 ? (
                        <div className="special-offer-chip-group">
                          <span className="field-help-text">Available on this profile</span>
                          <div className="review-chip-row">
                            {specialOfferBookmakerSuggestion.availableBookmakers.map((option) => (
                              <button
                                aria-pressed={formState.bookmaker === option}
                                className={`review-chip review-chip-action-positive${
                                  formState.bookmaker === option ? " is-active" : ""
                                }`}
                                key={option}
                                onClick={() =>
                                  void applyDropdownChange(
                                    (current) => ({ ...current, bookmaker: option }),
                                    "Bookmaker suggestion"
                                  )
                                }
                                type="button"
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {specialOfferBookmakerSuggestion.unavailableBookmakers.length > 0 ? (
                        <div className="special-offer-chip-group">
                          <span className="field-help-text">Unavailable on this profile</span>
                          <div className="review-chip-row">
                            {specialOfferBookmakerSuggestion.unavailableBookmakers.map((option) => (
                              <span className="review-chip review-chip-state-unavailable" key={option}>
                                {option}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {specialOfferBookmakerSuggestion.missingKnownBookmakers.length > 0 ? (
                        <div className="special-offer-chip-group">
                          <span className="field-help-text">Not yet linked on this profile</span>
                          <div className="review-chip-row">
                            {specialOfferBookmakerSuggestion.missingKnownBookmakers.map((option) => (
                              <span className="review-chip review-chip-state-muted" key={option}>
                                {option}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    {specialOfferBookmakerSuggestion.profileKnownBookmakers.length === 0 ? (
                      <p className="field-help-text" role="status">
                        Add one of these bookmakers in Settings before using this offer on this profile.
                      </p>
                    ) : null}
                    {specialOfferBookmakerSuggestion.selectedBookmakerState === "unavailable" ? (
                      <p className="field-validation-text" role="status">
                        The selected bookmaker is known for this offer but unavailable on this profile.
                      </p>
                    ) : null}
                    {specialOfferBookmakerSuggestion.selectedBookmakerState === "missing" ? (
                      <p className="field-help-text" role="status">
                        The selected bookmaker is known for this offer family but is not currently linked on this profile.
                      </p>
                    ) : null}
                    {specialOfferBookmakerSuggestion.allKnownBookmakersUnavailableOnProfile ? (
                      <p className="field-validation-text" role="status">
                        All known bookmakers for this special offer are unavailable on this profile.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <label
                  className={`field-control${
                    betSetupValidationActive && !formState.bet_type.trim() ? " is-invalid" : ""
                  }`}
                >
                  <span>Bet type (bet shape / placement)</span>
                  <select
                    aria-invalid={betSetupValidationActive && !formState.bet_type.trim()}
                    onChange={(event) =>
                      void applyDropdownChange(
                        (current) =>
                          applyBetTypeDefaults(current, normalizeSportsbookBetType(event.target.value)),
                        "Bet type change"
                      )
                    }
                    value={formState.bet_type}
                  >
                    <option value="">Select bet type</option>
                    {betTypeOptionsResolved.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <p className="field-help-text">
                    Use bet type for wager shape or placement context, for example Single, In Play + Single, Bet Builder, Correct Score, or First Goalscorer.
                  </p>
                </label>
                <label
                  className={`field-control${
                    betSetupValidationActive && !formState.offer_type.trim() ? " is-invalid" : ""
                  }`}
                >
                  <span>Offer type (promotion mechanism)</span>
                  <select
                    aria-invalid={betSetupValidationActive && !formState.offer_type.trim()}
                    onChange={(event) =>
                      void applyDropdownChange(
                        (current) =>
                          applyOfferTypeDefaults(
                            current,
                            event.target.value,
                            defaultBonusRetentionRate
                          ),
                        "Offer type change"
                      )
                    }
                    value={formState.offer_type}
                  >
                    <option value="">Select offer type</option>
                    {offerTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <p className="field-help-text">
                    Offer type describes the promotion mechanics, for example Bet &amp; Get, Price Boost, or Cashback.
                  </p>
                </label>
                <label className="field-control">
                  <span>Campaign tag (optional)</span>
                  <select
                    onChange={(event) =>
                      void applyDropdownChange(
                        (current) => ({ ...current, offer_name: event.target.value }),
                      "Campaign tag change"
                      )
                    }
                    value={formState.offer_name}
                  >
                    <option value="">Select campaign tag (optional)</option>
                    {offerNameOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label
                  className={`field-control${
                    betSetupValidationActive && !formState.fixture_type.trim() ? " is-invalid" : ""
                  }`}
                >
                  <span>Fixture type</span>
                  <select
                    aria-invalid={betSetupValidationActive && !formState.fixture_type.trim()}
                    onChange={(event) =>
                      void applyDropdownChange(
                        (current) => ({ ...current, fixture_type: event.target.value }),
                        "Fixture type change"
                      )
                    }
                    value={formState.fixture_type}
                  >
                    <option value="">Select fixture type</option>
                    {fixtureTypeOptionsResolved.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label
                  className={`field-control${
                    betSetupValidationActive && !formState.event_name.trim() ? " is-invalid" : ""
                  }`}
                >
                  <span>Event name</span>
                  <input
                    aria-invalid={betSetupValidationActive && !formState.event_name.trim()}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, event_name: event.target.value }))
                    }
                    value={formState.event_name}
                  />
                </label>
                <label className="field-control">
                  <span>Market (optional)</span>
                  <input
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, market: event.target.value }))
                    }
                    value={formState.market}
                  />
                </label>
                <label className="field-control">
                  <span>Status</span>
                  <select
                    onChange={(event) =>
                      void applyDropdownChange(
                        (current) => applyStatusDefaults(current, event.target.value),
                        "Status change"
                      )
                    }
                    value={formState.status}
                  >
                    {sportsbookStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                      ))}
                    </select>
                  </label>
                <label className="field-control">
                  <span>Settles</span>
                  <input
                    aria-invalid={betSetupValidationActive && missingPlacementFields.includes("Settles")}
                    onChange={(event) =>
                      setFormState((current) => ({
                          ...current,
                          date_settled: event.target.value,
                        }))
                      }
                      type="datetime-local"
                      value={formState.date_settled}
                    />
                    {formState.fixture_type === "Football" ? (
                      <div className="tracker-nav">
                        <button
                          className="button-link"
                          disabled={!canUseFootballSettlesAssist || footballSettlesAssistUsed}
                          onClick={applyFootballSettlesAssist}
                          type="button"
                        >
                          +90m Football
                        </button>
                        {footballSettlesAssistUsed ? (
                          <button
                            className="button-link"
                            onClick={resetFootballSettlesAssist}
                            type="button"
                          >
                            Reset
                          </button>
                        ) : null}
                        {footballSettlesAssistUsed ? (
                          <span className="table-chip">Football +90m Applied</span>
                        ) : null}
                      </div>
                    ) : null}
                  </label>
              </div>
              </fieldset>
              {isFreeBetAwardableRow && hasPersistedDraft ? (
                <div className="field-span-2 review-chip-row" role="group" aria-label="Free-bet bridge actions">
                  <span className="action-tooltip-wrap">
                    <button
                      aria-describedby="create-free-bet-tooltip"
                      className="review-chip review-chip-action-bridge"
                      onClick={() => void awardFreeBet()}
                      title="Copies bookmaker, offer type, bet type, fixture type, event, and source row ID."
                      type="button"
                    >
                      Create Free Bet
                    </button>
                    <span className="action-tooltip" id="create-free-bet-tooltip" role="tooltip">
                      Copies bookmaker, offer type, bet type, fixture type, event, and source row ID.
                    </span>
                  </span>
                </div>
              ) : null}
              {isFreeBetAwardableRow && !hasPersistedDraft ? (
                <p className="field-help-text field-span-2">
                  Save this row first to enable the &ldquo;Create Free Bet&rdquo; action.
                </p>
              ) : null}
            </EditorSection>

            <EditorSection
              headerAside={
                isSettledReadOnly ? (
                  <span className="section-lock-chip">Settled row locked</span>
                ) : !calculatorUnlocked ? (
                  <span className="section-lock-chip">Complete bet setup</span>
                ) : null
              }
              invalid={
                (calculatorUnlocked && missingCalculatorFields.length > 0) ||
                (betSetupValidationActive &&
                  placementPlanRequired &&
                  missingPlacementFields.length > 0)
              }
              title="Odds and matching"
            >
              {placementPlanRequired && missingPlacementFields.length > 0 ? (
                <p className="field-validation-text" role={betSetupValidationActive ? "alert" : "status"}>
                  {betSetupValidationActive
                    ? `Complete the required placed/settled sportsbook fields: ${missingPlacementFields.join(
                        ", "
                      )}.`
                    : `Placement currently incomplete: ${missingPlacementFields.join(
                        ", "
                      )}. Save remains blocked until these are filled.`}
                </p>
              ) : null}
              <fieldset
                className="section-fieldset stack"
                disabled={!calculatorUnlocked || isSettledReadOnly}
              >
                <div className="calculator-panel-shell">
                  <div className="calculator-panel-heading">
                      <div className="calculator-panel-heading-row">
                        <strong>{getCalculatorPanelTitle(formState)}</strong>
                        {showMatchRatingPill ? (
                          <span
                            className={`table-chip calculator-match-rating-pill calculator-match-rating-pill-${activeMatchRatingTone}`}
                            aria-label={`Match rating ${activeMatchRatingDisplay} percent. ${activeMatchRatingInterpretation}.`}
                            title={
                              activeMatchRatingTone === "arp"
                                ? "100%+ can indicate ARP profile risk on some bookmakers."
                                : "Back odds divided by lay odds; higher is a closer qualifying match."
                            }
                          >
                            Match Rating {activeMatchRatingDisplay}% · {activeMatchRatingInterpretation}
                          </span>
                        ) : null}
                      </div>
                  </div>
                  <div className="calculator-shell">
                    <div className="calculator-band calculator-band-primary">
                      <span className="eyebrow">Calculator</span>
                      {calculatorUnlocked && !isPreviewReady && missingCalculatorFields.length > 0 ? (
                        <p className="field-validation-text" role="alert">
                          Complete calculator inputs: {missingCalculatorFields.join(", ")}.
                        </p>
                      ) : null}
                      <div className="form-grid calculator-input-grid">
                        {calculatorRuleItems.length > 0 ? (
                          <div className="calculator-rule-row field-span-2" role="list" aria-label="Calculator branch rules">
                            {calculatorRuleItems.map((item) => (
                              <span className="calculator-rule-chip" key={item} role="listitem">
                                {item}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="field-span-2 calculator-segment calculator-segment-back">
                          <div className="calculator-segment-heading">
                            <span className="eyebrow">Back bet</span>
                          </div>
                          <div className="calculator-segment-grid calculator-segment-grid-back">
                            <label
                              className={`field-control${
                                calculatorUnlocked && missingCalculatorFields.includes("Back stake")
                                  ? " is-invalid"
                                  : ""
                              }`}
                            >
                              <span>Back stake</span>
                              <input
                                aria-invalid={calculatorUnlocked && missingCalculatorFields.includes("Back stake")}
                                onChange={(event) =>
                                  setFormState((current) => ({ ...current, back_stake: event.target.value }))
                                }
                                value={formState.back_stake}
                              />
                            </label>
                            <label
                              className={`field-control${
                                calculatorUnlocked && missingCalculatorFields.includes("Back odds")
                                  ? " is-invalid"
                                  : ""
                              }`}
                            >
                              <span>Back odds</span>
                              <input
                                aria-invalid={calculatorUnlocked && missingCalculatorFields.includes("Back odds")}
                                onChange={(event) =>
                                  setFormState((current) => ({ ...current, back_odds: event.target.value }))
                                }
                                value={formState.back_odds}
                              />
                            </label>
                          </div>
                          <div className="review-chip-row" role="group" aria-label="Back placement actions">
                            <button
                              className="review-chip review-chip-action-placement"
                              disabled={!backPlacementReady}
                              onClick={() => applyPlacementAction("back-placed")}
                              type="button"
                            >
                              Back Bet Placed
                            </button>
                          </div>
                        </div>

                        <div className="field-span-2 calculator-segment calculator-segment-lay">
                          <div className="calculator-segment-heading">
                            <span className="eyebrow">Lay / exchange</span>
                          </div>
                          <div className="calculator-segment-grid calculator-segment-grid-lay">
                            <label className="field-control">
                              <span>Strategy</span>
                              <select
                                onChange={(event) =>
                                  void applyDropdownChange(
                                    (current) => applyStrategyDefaults(current, event.target.value),
                                    "Strategy change"
                                  )
                                }
                                value={usesMultiLayStrategy ? "Multilay" : formState.match_strategy}
                              >
                                {visibleSportsbookStrategyOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option === "Multilay" ? "Multi Lay" : option}
                                  </option>
                                ))}
                              </select>
                            </label>
                            {!isNoLayStrategy ? (
                              <label
                                className={`field-control${
                                  calculatorUnlocked && missingCalculatorFields.includes("Exchange")
                                    ? " is-invalid"
                                    : ""
                                }`}
                              >
                                <span>Exchange</span>
                                <select
                                  aria-invalid={calculatorUnlocked && missingCalculatorFields.includes("Exchange")}
                                  onChange={(event) =>
                                    void applyDropdownChange(
                                      (current) => ({ ...current, exchange_name: event.target.value }),
                                      "Exchange change"
                                    )
                                  }
                                  value={formState.exchange_name}
                                >
                                  <option value="">Select exchange</option>
                                  {exchangeOptions.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ) : null}
                            {!isNoLayStrategy && !usesMultiLayStrategy ? (
                              <label
                                className={`field-control${
                                  calculatorUnlocked && missingCalculatorFields.includes("Lay odds 1")
                                    ? " is-invalid"
                                    : ""
                                }`}
                              >
                                <span>Lay odds 1</span>
                                <input
                                  aria-invalid={calculatorUnlocked && missingCalculatorFields.includes("Lay odds 1")}
                                  onChange={(event) =>
                                    setFormState((current) => ({
                                      ...current,
                                      lay_odds_1: event.target.value,
                                    }))
                                  }
                                  value={formState.lay_odds_1}
                                />
                              </label>
                            ) : null}
                            {!isNoLayStrategy && !usesMultiLayStrategy ? (
                              <label
                                className={`field-control${
                                  calculatorUnlocked && missingCalculatorFields.includes("Lay actual")
                                    ? " is-invalid"
                                    : ""
                                }`}
                              >
                                <span>Lay actual</span>
                                <input
                                  aria-invalid={calculatorUnlocked && missingCalculatorFields.includes("Lay actual")}
                                  onChange={(event) =>
                                    setFormState((current) => ({
                                      ...current,
                                      lay_actual: event.target.value,
                                    }))
                                  }
                                  value={formState.lay_actual}
                                />
                              </label>
                            ) : null}
                            {isCashbackOffer ? (
                              <label className="field-control">
                                <span>Bonus trigger</span>
                                <select
                                  onChange={(event) =>
                                    void applyDropdownChange(
                                      (current) => {
                                        const nextTrigger = event.target.value;
                                        const nextResultOptions = getSportsbookResultOptions(
                                          current.offer_type,
                                          current.match_strategy,
                                          nextTrigger
                                        );
                                        const nextResultValues = new Set(
                                          nextResultOptions.map((option) => option.value)
                                        );
                                        return {
                                          ...current,
                                          bonus_trigger: nextTrigger,
                                          result: nextResultValues.has(current.result)
                                            ? current.result
                                            : "Pending",
                                        };
                                      },
                                      "Bonus trigger change"
                                    )
                                  }
                                  value={formState.bonus_trigger}
                                >
                                  <option value="Lay Wins">Bet loses / lay wins</option>
                                  <option value="Back Wins">Bet wins / back wins</option>
                                </select>
                              </label>
                            ) : null}
                            {isCashbackOffer ? (
                              <label
                                className={`field-control${
                                  calculatorUnlocked && missingCalculatorFields.includes("Maximum bonus")
                                    ? " is-invalid"
                                    : ""
                                }`}
                              >
                                <span>Maximum bonus</span>
                                <input
                                  aria-invalid={calculatorUnlocked && missingCalculatorFields.includes("Maximum bonus")}
                                  onChange={(event) =>
                                    setFormState((current) => ({
                                      ...current,
                                      maximum_bonus: event.target.value,
                                    }))
                                  }
                                  value={formState.maximum_bonus}
                                />
                              </label>
                            ) : null}
                            {isRefundOffer ? (
                              <label
                                className={`field-control${
                                  calculatorUnlocked && missingCalculatorFields.includes("Bonus retention %")
                                    ? " is-invalid"
                                    : ""
                                }`}
                              >
                                <span>Bonus retention %</span>
                                <input
                                  aria-invalid={calculatorUnlocked && missingCalculatorFields.includes("Bonus retention %")}
                                  onChange={(event) =>
                                    setFormState((current) => ({
                                      ...current,
                                      bonus_retention_rate: event.target.value,
                                    }))
                                  }
                                  value={formState.bonus_retention_rate}
                                />
                              </label>
                            ) : null}
                          </div>

                          {isCustomStrategy && !usesMultiLayStrategy ? (
                            <div className="content-subpanel stack custom-slider-panel" aria-label="Custom lay slider">
                              <div className="section-heading-row">
                                <span className="eyebrow">Custom lay slider</span>
                                {formState.lay_actual.trim() ? (
                                  <span className="table-chip">
                                    {formState.lay_actual}
                                  </span>
                                ) : null}
                              </div>
                              <div className="custom-slider-row">
                                <label className="field-control custom-slider-range-label">
                                  <span>Min</span>
                                  <input
                                    min="0.01"
                                    onChange={(event) => setCustomSliderMin(event.target.value)}
                                    step="0.01"
                                    type="number"
                                    value={
                                      customSliderMin ||
                                      String(customSliderEffectiveMin)
                                    }
                                  />
                                </label>
                                <div className="custom-slider-track-wrap">
                                  <input
                                    aria-label="Lay stake slider"
                                    aria-valuemax={customSliderEffectiveMax}
                                    aria-valuemin={customSliderEffectiveMin}
                                    aria-valuenow={customSliderCurrentFloat}
                                    className="custom-slider-track"
                                    max={customSliderEffectiveMax}
                                    min={customSliderEffectiveMin}
                                    onChange={(event) =>
                                      setFormState((current) => ({
                                        ...current,
                                        lay_actual: event.target.value,
                                      }))
                                    }
                                    step="0.01"
                                    type="range"
                                    value={customSliderCurrentFloat}
                                  />
                                </div>
                                <label className="field-control custom-slider-range-label">
                                  <span>Max</span>
                                  <input
                                    min="0.01"
                                    onChange={(event) => setCustomSliderMax(event.target.value)}
                                    step="0.01"
                                    type="number"
                                    value={
                                      customSliderMax ||
                                      String(customSliderEffectiveMax)
                                    }
                                  />
                                </label>
                              </div>
                              {customSliderFeedback ? (
                                <div className="summary-list">
                                  <p className="lede">
                                    <span className="summary-label">Liability</span>
                                    <strong>{customSliderFeedback.liability}</strong>
                                  </p>
                                  <p className="lede">
                                    <span className="summary-label">If back wins</span>
                                    <strong>{customSliderFeedback.backWinsPnl}</strong>
                                  </p>
                                  <p className="lede">
                                    <span className="summary-label">If lay wins</span>
                                    <strong>{customSliderFeedback.layWinsPnl}</strong>
                                  </p>
                                </div>
                              ) : (
                                <p className="lede">
                                  Complete back stake, back odds, and lay odds to see live feedback.
                                </p>
                              )}
                              <div className="tracker-nav">
                                <button
                                  className="review-chip review-chip-copy"
                                  disabled={!formState.lay_actual.trim()}
                                  onClick={() => void copyCustomSliderValue()}
                                  type="button"
                                >
                                  Copy {formState.lay_actual || "—"}
                                </button>
                              </div>
                            </div>
                          ) : null}

                          {!isNoLayStrategy && !usesMultiLayStrategy ? (
                            <div className="review-chip-row" role="group" aria-label="Lay placement actions">
                              <button
                                className="review-chip review-chip-action-negative"
                                disabled={!layPlacementReady}
                                onClick={() => addPartialLayLeg({ isFinal: false })}
                                type="button"
                              >
                                Lay Placed but Partially Matched
                              </button>
                              <button
                                className="review-chip review-chip-action-positive"
                                disabled={!layPlacementReady}
                                onClick={() => addPartialLayLeg({ isFinal: true })}
                                type="button"
                              >
                                Lay Fully Placed
                              </button>
                            </div>
                          ) : null}
                          {!isNoLayStrategy && !usesMultiLayStrategy ? (
                            <p className="field-help-text">
                              Confirm lay execution from these actions as each leg is matched.
                            </p>
                          ) : null}
                        </div>

                        {!isNoLayStrategy && !usesMultiLayStrategy && partialLayLegs.length > 0 ? (
                          <div className="field-span-2 content-subpanel stack partial-lay-panel" aria-label="Partial lay legs">
                            <div className="section-heading-row">
                              <span className="eyebrow">Partial lay legs</span>
                              <span className="table-chip">{partialLayLegs.length} legs</span>
                            </div>
                            <div className="stack">
                              {partialLayLegs.map((leg, index) => (
                                <div className="partial-lay-leg-item" key={leg.id}>
                                  <div className="partial-lay-leg-row">
                                    <label className="field-control">
                                      <span>{leg.isFinal ? `Final leg ${index + 1}` : `Partial leg ${index + 1}`}</span>
                                      <select
                                        onChange={(event) =>
                                          updatePartialLayLeg(leg.id, "exchangeName", event.target.value)
                                        }
                                        value={leg.exchangeName}
                                      >
                                        <option value="">Select exchange</option>
                                        {exchangeOptions.map((option) => (
                                          <option key={option} value={option}>
                                            {option}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <label className="field-control">
                                      <span>Lay odds</span>
                                      <input
                                        onChange={(event) =>
                                          updatePartialLayLeg(leg.id, "layOdds", event.target.value)
                                        }
                                        value={leg.layOdds}
                                      />
                                    </label>
                                    <label className="field-control">
                                      <span>{leg.isFinal ? "Final matched stake" : "Matched stake"}</span>
                                      <div className="inline-field-action">
                                        <input
                                          onChange={(event) =>
                                            updatePartialLayLeg(leg.id, "matchedStake", event.target.value)
                                          }
                                          value={leg.matchedStake}
                                        />
                                        <button
                                          aria-label={leg.isFinal ? "Remove final lay leg" : "Remove lay leg"}
                                          className="icon-button icon-button-destructive leg-remove-icon"
                                          onClick={() => requestRemovePartialLayLeg(leg.id)}
                                          title={leg.isFinal ? "Remove final lay leg" : "Remove lay leg"}
                                          type="button"
                                        >
                                          <svg
                                            aria-hidden="true"
                                            className="leg-remove-icon-svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              d="M4 7h16M10 3h4m-7 4 1 13a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-13M10 11v6m4-6v6"
                                              stroke="currentColor"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth="1.8"
                                            />
                                          </svg>
                                        </button>
                                      </div>
                                    </label>
                                  </div>
                                  {pendingLegRemovalId === leg.id ? (
                                    <div className="leg-remove-warning" role="alert">
                                      <p className="field-validation-text">
                                        Are you sure? lay has been entered.
                                      </p>
                                      <div className="tracker-nav">
                                        <button
                                          className="review-chip review-chip-danger"
                                          onClick={() => confirmRemovePartialLayLeg(leg.id)}
                                          type="button"
                                        >
                                          Remove Lay Leg
                                        </button>
                                        <button
                                          className="button-link"
                                          onClick={() => setPendingLegRemovalId(null)}
                                          type="button"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                              {lastRemovedPartialLayLeg ? (
                                <div className="leg-remove-undo">
                                  <button
                                    className="button-link"
                                    onClick={undoRemovePartialLayLeg}
                                    type="button"
                                  >
                                    Undo
                                  </button>
                                </div>
                              ) : null}
                            </div>
                            <div className="summary-list">
                              <p className="lede">
                                <span className="summary-label">Matched so Far</span>
                                <strong>{formatPreviewMoney(partialLayExecutionSummary.matchedTotal)}</strong>
                              </p>
                              <p className="lede">
                                <span className="summary-label">Target Lay</span>
                                <strong>
                                  {partialLayExecutionSummary.targetLayStake === null
                                    ? "—"
                                    : formatPreviewMoney(partialLayExecutionSummary.targetLayStake)}
                                </strong>
                              </p>
                              <p className="lede">
                                <span className="summary-label">Remaining to Match</span>
                                <strong>
                                  {partialLayExecutionSummary.remainingToMatch === null
                                    ? "—"
                                    : formatPreviewMoney(partialLayExecutionSummary.remainingToMatch)}
                                </strong>
                              </p>
                              <p className="lede">
                                <span className="summary-label">Recommended Next Lay Stake</span>
                                <span className="summary-value-with-action">
                                  <button
                                    className="review-chip review-chip-copy"
                                    disabled={!canCopyRecommendedNextLayStake}
                                    onClick={() => void copyRecommendedNextLayStake()}
                                    type="button"
                                  >
                                    {recommendedNextLayStakeDisplay}
                                  </button>
                                </span>
                              </p>
                            </div>
                            {hasPartialLayShortfall ? (
                              <p className="field-validation-text" role="status">
                                Remaining lay exposure is still open. Use Recommended Next Lay Stake to place the next leg and re-check liability.
                              </p>
                            ) : null}
                            {hasPartialLayOvermatch ? (
                              <p className="field-validation-text" role="status">
                                Matched lay stake exceeds target. Review exchange entries and confirm this overmatch is intentional.
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {!usesMultiLayStrategy ? (
                      <div className="calculator-band calculator-band-secondary sportsbook-calculator-grid">
                        {!isNoLayStrategy ? (
                          <div className="calculator-panel-card">
                            <span className="eyebrow">Suggested lay</span>
                            {layStakePreview ? (
                              <div className="stack">
                                {isCalculatedState ? (
                                  <div className="tracker-nav">
                                    <span className="table-chip table-chip-lay-full">Calculated</span>
                                  </div>
                                ) : null}
                                <strong>
                                  Best-value lay suggestion ({layStakePreview.modeLabel}): {layStakePreview.suggested}
                                </strong>
                                <p className="field-help-text">
                                  Current best-value suggestion from contract-backed lay references.
                                </p>
                                <div className="summary-list">
                                  <p className="lede">
                                    <span className="summary-label">Standard</span>
                                    <button
                                      className="button-link"
                                      disabled={
                                        (activePreviewCalculation?.reference_lay_stake_standard ??
                                          selectedSportsbookRow?.reference_lay_stake_standard ??
                                          "—") === "—"
                                      }
                                      onClick={() => void applySuggestedLayValue("Standard")}
                                      type="button"
                                    >
                                      {activePreviewCalculation?.reference_lay_stake_standard ??
                                        selectedSportsbookRow?.reference_lay_stake_standard ??
                                        "—"}
                                    </button>
                                  </p>
                                  <p className="lede">
                                    <span className="summary-label">Underlay</span>
                                    <button
                                      className="button-link"
                                      disabled={
                                        (activePreviewCalculation?.reference_lay_stake_underlay ??
                                          selectedSportsbookRow?.reference_lay_stake_underlay ??
                                          "—") === "—"
                                      }
                                      onClick={() => void applySuggestedLayValue("Underlay")}
                                      type="button"
                                    >
                                      {activePreviewCalculation?.reference_lay_stake_underlay ??
                                        selectedSportsbookRow?.reference_lay_stake_underlay ??
                                        "—"}
                                    </button>
                                  </p>
                                  <p className="lede">
                                    <span className="summary-label">Overlay</span>
                                    <button
                                      className="button-link"
                                      disabled={
                                        (activePreviewCalculation?.reference_lay_stake_overlay ??
                                          selectedSportsbookRow?.reference_lay_stake_overlay ??
                                          "—") === "—"
                                      }
                                      onClick={() => void applySuggestedLayValue("Overlay")}
                                      type="button"
                                    >
                                      {activePreviewCalculation?.reference_lay_stake_overlay ??
                                        selectedSportsbookRow?.reference_lay_stake_overlay ??
                                        "—"}
                                    </button>
                                  </p>
                                </div>
                                {visibleCalculationNotes.length > 0 ? (
                                  <div className="summary-list">
                                    {visibleCalculationNotes.slice(0, 2).map((note) => (
                                      <p className="lede" key={note}>
                                        {note}
                                      </p>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <p className="lede">{calculatorGuidance}</p>
                            )}
                          </div>
                        ) : null}
                        <div className="calculator-panel-card">
                          <span className="eyebrow">
                            {isDdhhOffer
                              ? "DD/HH results"
                              : isCashbackOffer
                                ? isRefundOffer
                                  ? "Bonus lock-in results"
                                  : "Cashback results"
                                : "Projected outcomes"}
                          </span>
                          {isPreviewReady && activePreviewCalculation ? (
                            <div className="stack">
                              <strong>
                                {getDisplayedValueLabel(activePreviewCalculation, null)}:{" "}
                                {getDisplayedValue(activePreviewCalculation, null)}
                              </strong>
                              <div className="summary-list">
                                <p className="lede">
                                  <span className="summary-label">
                                    {getOutcomeCardLabel(getOutcomeCardState(formState.result, "back"))}
                                  </span>
                                  <span>
                                    {getScenarioBranchText(
                                      scenarioBranchLabels.backWinLabel,
                                      formState.result
                                    )}
                                    : {activePreviewCalculation.scenario_pnl_if_back_wins ?? "—"}
                                  </span>
                                </p>
                                <p className="lede">
                                  <span className="summary-label">
                                    {getOutcomeCardLabel(getOutcomeCardState(formState.result, "lay"))}
                                  </span>
                                  <span>
                                    {getScenarioBranchText(
                                      scenarioBranchLabels.layWinLabel,
                                      formState.result
                                    )}
                                    : {activePreviewCalculation.scenario_pnl_if_lay_wins ?? "—"}
                                  </span>
                                </p>
                                {scenarioBranchLabels.outcome2Label &&
                                activePreviewCalculation.scenario_pnl_if_outcome_2_wins !== null ? (
                                  <p className="lede">
                                    <span className="summary-label">
                                      {getOutcomeCardLabel(
                                        getOutcomeCardState(formState.result, "outcome2")
                                      )}
                                    </span>
                                    <span>
                                      {getScenarioBranchText(
                                        scenarioBranchLabels.outcome2Label,
                                        formState.result
                                      ) ?? "Outcome 2"}
                                      : {activePreviewCalculation.scenario_pnl_if_outcome_2_wins ?? "—"}
                                    </span>
                                  </p>
                                ) : null}
                                {scenarioBranchLabels.outcome3Label &&
                                activePreviewCalculation.scenario_pnl_if_outcome_3_wins !== null ? (
                                  <p className="lede">
                                    <span className="summary-label">
                                      {getOutcomeCardLabel(
                                        getOutcomeCardState(formState.result, "outcome3")
                                      )}
                                    </span>
                                    <span>
                                      {getScenarioBranchText(
                                        scenarioBranchLabels.outcome3Label,
                                        formState.result
                                      ) ?? "Outcome 3"}
                                      : {activePreviewCalculation.scenario_pnl_if_outcome_3_wins ?? "—"}
                                    </span>
                                  </p>
                                ) : null}
                              </div>
                              {isRefundOffer ? (
                                <p className="lede">
                                  Retained bonus assumption:{" "}
                                  <strong>
                                    {formState.bonus_retention_rate || defaultBonusRetentionRate}% of{" "}
                                    {formState.maximum_bonus || formState.back_stake || "0.00"}
                                  </strong>
                                </p>
                              ) : null}
                              {visibleCalculationNotes.length > 0 ? (
                                <div className="summary-list">
                                  {visibleCalculationNotes.slice(0, 2).map((note) => (
                                    <p className="lede" key={note}>
                                      {note}
                                    </p>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <p className="lede">{calculatorGuidance}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="calculator-band calculator-band-secondary calculator-band-single">
                        <div className="calculator-panel-card">
                          <span className="eyebrow">Multi-lay planner</span>
                          <div className="stack">
                            <div className="tracker-nav">
                              <span className="table-chip">
                                {getCalculationStateLabel(activeCalculationState)}
                              </span>
                              <button
                                aria-checked={formState.match_strategy === "Multilay-Underlay"}
                                className={`material-switch${
                                  formState.match_strategy === "Multilay-Underlay" ? " is-selected" : ""
                                }`}
                                onClick={() =>
                                  void applyDropdownChange(
                                    (current) =>
                                      applyStrategyDefaults(
                                        current,
                                        current.match_strategy === "Multilay-Underlay"
                                          ? "Multilay"
                                          : "Multilay-Underlay"
                                      ),
                                    "Multi-lay underlay change"
                                  )
                                }
                                role="switch"
                                type="button"
                              >
                                <span aria-hidden="true" className="material-switch-track">
                                  <span className="material-switch-thumb" />
                                </span>
                                <span>Underlay</span>
                              </button>
                              <span className="table-chip">{multiLayPlacementStatus}</span>
                            </div>
                            <div className="multi-lay-grid-wrap">
                              <table className="data-table multi-lay-planner-grid">
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>Outcome</th>
                                    <th>Odds</th>
                                    <th>Comm %</th>
                                    <th>Lay Stake</th>
                                    {formState.match_strategy === "Multilay-Underlay" ? <th>Underlay Stake</th> : null}
                                    <th>Liability</th>
                                    <th>Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td>1</td>
                                    <td>
                                      <label className="field-control">
                                        <span className="sr-only">Outcome 1 name</span>
                                        <input
                                          placeholder="Outcome 1 name"
                                          onChange={(event) =>
                                            setMultiLayOutcome1Label(
                                              sanitizeMultiLayOutcomeLabel(event.target.value)
                                            )
                                          }
                                          maxLength={20}
                                          value={multiLayOutcome1Label}
                                        />
                                      </label>
                                    </td>
                                    <td>
                                      <label className="field-control">
                                        <span className="sr-only">Outcome 1 lay odds</span>
                                        <input
                                          placeholder="Odds for outcome 1"
                                          aria-invalid={
                                            calculatorUnlocked &&
                                            missingCalculatorFields.includes("Outcome 2 lay odds") &&
                                            !multiLayOutcomes.some((outcome) => parseNumericInput(outcome.layOdds) !== null)
                                          }
                                          onChange={(event) =>
                                            setFormState((current) => ({
                                              ...current,
                                              lay_odds_1: event.target.value,
                                            }))
                                          }
                                          value={formState.lay_odds_1}
                                        />
                                      </label>
                                    </td>
                                    <td>{resolvedCommission || "—"}</td>
                                    <td>
                                      {multiLayPlannerSummary?.legs.find((leg) => leg.key === "outcome1")?.standardLay ?? "—"}
                                    </td>
                                    {formState.match_strategy === "Multilay-Underlay" ? (
                                      <td>
                                        {multiLayPlannerSummary?.legs.find((leg) => leg.key === "outcome1")?.underlayLay ?? "—"}
                                      </td>
                                    ) : null}
                                    <td>
                                      {multiLayPlannerSummary?.legs.find((leg) => leg.key === "outcome1")?.liability ?? "—"}
                                    </td>
                                    <td>
                                      <div className="multi-lay-row-actions">
                                        <button
                                          aria-label="Copy lay for outcome 1 and mark placed"
                                          className="icon-button multi-lay-action-button"
                                          disabled={!multiLayPlannerSummary?.legs.find((leg) => leg.key === "outcome1")}
                                          onClick={() => {
                                            const leg = multiLayPlannerSummary?.legs.find((entry) => entry.key === "outcome1");
                                            if (leg) {
                                              void copyMultiLayStake(leg);
                                            }
                                          }}
                                          title="Copy lay and mark placed"
                                          type="button"
                                        >
                                          <span aria-hidden="true" className="material-symbols-outlined">
                                            copy_all
                                          </span>
                                        </button>
                                        <span aria-hidden="true" className="multi-lay-action-placeholder" />
                                      </div>
                                    </td>
                                  </tr>
                                  {multiLayOutcomes.map((outcome, index) => {
                                    const leg = multiLayPlannerSummary?.legs.find((entry) => entry.key === outcome.id);
                                    return (
                                      <tr key={outcome.id}>
                                        <td>{index + 2}</td>
                                        <td>
                                          <label className="field-control">
                                            <span className="sr-only">{`Outcome ${index + 2} name`}</span>
                                            <input
                                              placeholder={`Outcome ${index + 2} name`}
                                              onChange={(event) =>
                                                setMultiLayOutcomes((current) =>
                                                  current.map((entry) =>
                                                    entry.id === outcome.id
                                                      ? {
                                                          ...entry,
                                                          label: sanitizeMultiLayOutcomeLabel(event.target.value),
                                                        }
                                                      : entry
                                                  )
                                                )
                                              }
                                              maxLength={20}
                                              value={outcome.label}
                                            />
                                          </label>
                                        </td>
                                        <td>
                                          <label className="field-control">
                                            <span className="sr-only">{`Outcome ${index + 2} lay odds`}</span>
                                            <input
                                              placeholder={`Odds for outcome ${index + 2}`}
                                              aria-invalid={
                                                calculatorUnlocked &&
                                                missingCalculatorFields.includes("Outcome 2 lay odds") &&
                                                index === 0 &&
                                                parseNumericInput(outcome.layOdds) === null
                                              }
                                              onChange={(event) =>
                                                setMultiLayOutcomes((current) =>
                                                  current.map((entry) =>
                                                    entry.id === outcome.id
                                                      ? { ...entry, layOdds: event.target.value }
                                                      : entry
                                                  )
                                                )
                                              }
                                              value={outcome.layOdds}
                                            />
                                          </label>
                                        </td>
                                        <td>{resolvedCommission || "—"}</td>
                                        <td>{leg?.standardLay ?? "—"}</td>
                                        {formState.match_strategy === "Multilay-Underlay" ? (
                                          <td>{leg?.underlayLay ?? "—"}</td>
                                        ) : null}
                                        <td>{leg?.liability ?? "—"}</td>
                                        <td>
                                          <div className="multi-lay-row-actions">
                                            <button
                                              aria-label={`Copy lay for ${outcome.label || `outcome ${index + 2}`} and mark placed`}
                                              className="icon-button multi-lay-action-button"
                                              disabled={!leg}
                                              onClick={() => {
                                                if (leg) {
                                                  void copyMultiLayStake(leg);
                                                }
                                              }}
                                              title="Copy lay and mark placed"
                                              type="button"
                                            >
                                              <span aria-hidden="true" className="material-symbols-outlined">
                                                copy_all
                                              </span>
                                            </button>
                                            {index >= 1 ? (
                                              <button
                                                aria-label={`Remove ${outcome.label || `outcome ${index + 2}`}`}
                                                className="icon-button icon-button-destructive multi-lay-action-button"
                                                onClick={() => removeMultiLayOutcome(outcome.id)}
                                                title="Remove outcome"
                                                type="button"
                                              >
                                                <span aria-hidden="true" className="material-symbols-outlined">
                                                  delete
                                                </span>
                                              </button>
                                            ) : (
                                              <span aria-hidden="true" className="multi-lay-action-placeholder" />
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            <div className="tracker-nav">
                              <button className="button-link" onClick={addMultiLayOutcome} type="button">
                                Add outcome
                              </button>
                            </div>
                          </div>
                          {multiLayPlannerSummary ? (
                            <div className="stack">
                              <p className="lede">
                                Your total liability is{" "}
                                <strong>{multiLayPlannerSummary.totalLiability}</strong>.
                              </p>
                              <p className="lede">
                                Conservative current value:{" "}
                                <strong>{multiLayPlannerSummary.currentValue}</strong>.
                              </p>
                              <div className="multi-lay-grid-wrap">
                                <table className="data-table multi-lay-results-grid">
                                  <thead>
                                    <tr>
                                      <th>Outcome</th>
                                      <th>Bookmaker</th>
                                      {multiLayPlannerSummary.legs.map((leg) => (
                                        <th key={`branch-${leg.key}`}>{leg.label}</th>
                                      ))}
                                      <th>Profit</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {multiLayResultsGridRows.map((row) => (
                                      <tr key={row.key}>
                                        <td>{row.outcomeLabel}</td>
                                        <td>{row.bookmakerValue}</td>
                                        {multiLayPlannerSummary.legs.map((leg) => (
                                          <td key={`${row.key}-${leg.key}`}>
                                            {row.branchValues[leg.key] ?? "—"}
                                          </td>
                                        ))}
                                        <td>{row.profit}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              {activeCalculationNotes.length > 0 ? (
                                <div className="summary-list">
                                  {activeCalculationNotes.slice(0, 2).map((note) => (
                                    <p className="lede" key={note}>
                                      {note}
                                    </p>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <p className="lede">{calculatorGuidance}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </fieldset>
            </EditorSection>

            {showsPlacementSection ? (
              <EditorSection
                headerAside={
                  isSettledReadOnly ? <span className="section-lock-chip">Settled row locked</span> : null
                }
                invalid={
                  betSetupValidationActive &&
                  placementPlanRequired &&
                  missingPlacementFields.length > 0
                }
                title="Placement"
              >
                <fieldset className="section-fieldset" disabled={isSettledReadOnly}>
                  {usesMultiLayStrategy ? (
                    <div className="multi-lay-grid-wrap">
                      <table className="data-table multi-lay-placement-grid">
                        <thead>
                          <tr>
                            <th>Outcome</th>
                            <th>Exchange</th>
                            <th>Lay Odds</th>
                            <th>Matched Stake</th>
                            <th>State</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {multiLayPlacementRows.map((row) => (
                            <tr key={`placement-${row.key}`}>
                              <td>{row.label}</td>
                              <td>
                                <label className="field-control">
                                  <span className="sr-only">{`${row.label} exchange`}</span>
                                  <select
                                    onChange={(event) =>
                                      updateMultiLayPlacementField(row.key, "placedExchange", event.target.value)
                                    }
                                    value={row.placedExchange}
                                  >
                                    <option value="">Select exchange</option>
                                    {exchangeOptions.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </td>
                              <td>
                                <label className="field-control">
                                  <span className="sr-only">{`${row.label} placed lay odds`}</span>
                                  <input
                                    onChange={(event) =>
                                      updateMultiLayPlacementField(row.key, "placedLayOdds", event.target.value)
                                    }
                                    value={row.placedLayOdds}
                                  />
                                </label>
                              </td>
                              <td>
                                <label className="field-control">
                                  <span className="sr-only">{`${row.label} matched stake`}</span>
                                  <input
                                    onChange={(event) => {
                                      updateMultiLayPlacementField(row.key, "placedMatchedStake", event.target.value);
                                      updateMultiLayPlacementField(
                                        row.key,
                                        "placementState",
                                        parseNumericInput(event.target.value) !== null ? "placed" : "pending"
                                      );
                                    }}
                                    value={row.placedMatchedStake}
                                  />
                                </label>
                              </td>
                              <td>{row.placementState === "placed" ? "Placed" : "Pending"}</td>
                              <td>
                                <button
                                  className="button-link"
                                  onClick={() => void removeMultiLayPlacement(row.key)}
                                  type="button"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="form-grid">
                      <label className="field-control">
                        <span>Lay matched stake 1</span>
                        <input
                          onChange={(event) =>
                            setFormState((current) => ({
                              ...current,
                              lay_matched_stake_1: event.target.value,
                            }))
                          }
                          value={formState.lay_matched_stake_1}
                        />
                      </label>
                    </div>
                  )}
                </fieldset>
              </EditorSection>
            ) : null}

            <EditorSection
              defaultOpen={Boolean(selectedId)}
              key={selectedId ?? "sportsbook-settlement-new"}
              title="Settlement"
            >
              <fieldset className="section-fieldset" disabled={isSettledReadOnly}>
                <div className="form-grid">
                  <label className="field-control">
                    <span>Result</span>
                    <select
                      onChange={(event) =>
                        void applyDropdownChange(
                          (current) => applyResultDefaults(current, event.target.value),
                          "Result change"
                        )
                      }
                      value={formState.result}
                    >
                      {resultOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {settlementReviewRule ? (
                    <label className="field-control field-span-2">
                      <span>Settlement review</span>
                      <input readOnly value={settlementReviewRule} />
                    </label>
                  ) : null}
                </div>
              </fieldset>
            </EditorSection>

            <EditorSection defaultOpen={false} title="Advanced controls">
              {(
                selectedSportsbookRow?.calculation_notes.length ||
                (showCalculationSummary && activePreviewCalculation?.calculation_notes.length)
              ) ? (
                <section className="stack">
                  <span className="eyebrow">Calculation notes</span>
                  {(activePreviewCalculation?.calculation_notes.length
                    ? activePreviewCalculation.calculation_notes
                    : selectedSportsbookRow?.calculation_notes ?? []).map((note) => (
                      <p className="lede" key={note}>
                        {note}
                      </p>
                    ))}
                </section>
              ) : null}
              {showCalculationSummary ? (
                <section className="stack">
                  <span className="eyebrow">Contract trace</span>
                  <div className="meta-grid">
                    <dl>
                      <dt>Calculation state</dt>
                      <dd>
                        {activePreviewCalculation?.calculation_state ??
                          selectedSportsbookRow?.calculation_state ??
                          "—"}
                      </dd>
                    </dl>
                    <dl>
                      <dt>Displayed value source</dt>
                      <dd>
                        {getCalculationValueSource(
                          activePreviewCalculation,
                          selectedSportsbookRow
                        )}
                      </dd>
                    </dl>
                    <dl>
                      <dt>Reporting figure shown</dt>
                      <dd>
                        {getDisplayedValue(activePreviewCalculation, selectedSportsbookRow)}
                      </dd>
                    </dl>
                    <dl>
                      <dt>Override audit</dt>
                      <dd>
                        {formState.manual_override_value.trim()
                          ? formState.manual_override_reason.trim()
                            ? "Manual override includes an audit reason."
                            : "Manual override now requires a reason and will stay review-required without one."
                          : "No manual override is active for this row."}
                      </dd>
                    </dl>
                  </div>
                </section>
              ) : null}
              <fieldset className="section-fieldset" disabled={isSettledReadOnly}>
              <div className="form-grid">
                <label className="field-control field-span-2">
                  <span>Manual override value</span>
                  <input
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        manual_override_value: event.target.value,
                      }))
                    }
                    value={formState.manual_override_value}
                  />
                </label>
                <label className="field-control field-span-2">
                  <span>Manual override reason</span>
                  <input
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        manual_override_reason: event.target.value,
                      }))
                    }
                    value={formState.manual_override_reason}
                  />
                </label>
                <label className="field-control field-span-2">
                  <span>Notes</span>
                  <textarea
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, user_notes: event.target.value }))
                    }
                    rows={5}
                    value={formState.user_notes}
                  />
                </label>
              </div>
              </fieldset>
            </EditorSection>
            <div className="tracker-nav field-span-2">
              <button
                className="review-chip review-chip-copy"
                disabled={isPending || isSettledReadOnly}
                type="submit"
              >
                Save
              </button>
              {selectedId ? (
                <button
                  className="review-chip review-chip-danger"
                  onClick={() => void handleDeleteSelectedRow()}
                  type="button"
                >
                  Delete
                </button>
              ) : null}
              <button className="review-chip" onClick={handleResetForm} type="button">
                Revert
              </button>
              <button className="button-link tracker-nav-right-action" onClick={closeEditor} type="button">
                Close
              </button>
            </div>
          </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
