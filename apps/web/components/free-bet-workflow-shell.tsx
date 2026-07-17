"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { apiBaseUrl } from "@/lib/api";
import { getAccountNamesByType, type AccountAuthorityRecord } from "@/lib/account-authorities";
import { StatusToast } from "@/components/status-toast";
import { BookmakerIdentity, useBookmakerCatalogue } from "@/components/bookmaker-identity";
import { EditorSection } from "@/components/editor-section";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "@/lib/date-format";
import {
  scrollToElementTopAfterRender,
  useDialogFocusLifecycle,
  usePersistedBoolean,
  usePersistedState,
  useToastDismiss,
  useTrackerRouteReselect,
} from "@/lib/ledger-ui";
import { getLookupValuesByType, type LookupValueRecord } from "@/lib/lookup-values";
import type { TableColumn } from "@/lib/tracker-modules";
import { formatDisplayDate, formatMoney, resolveDateRange, type DatePreset } from "@/lib/tracker-summary";
import { filterTrackerRows, getTrackerPageCount, paginateTrackerRows } from "@/lib/tracker-table";
import type { TrackerRow } from "@/lib/tracker-types";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { sortIssueBadgesByPriority } from "@/lib/issue-priority";
import {
  dedupeOptions,
  filterCampaignTagOptions,
  fixtureTypeOptions,
  freeBetResultOptions,
  freeBetRetentionModeOptions,
  freeBetStatusOptions,
  freeBetStrategyOptions,
  getAllowedBetTypesForOfferType,
  getDefaultBetTypeForOfferType,
  getOfferTypeDescriptor,
  getOfferTypeOptions,
  normalizeSportsbookBetType,
} from "@/lib/workbook-options";

type FreeBetOutcomeCardState = "possible" | "hit" | "missed" | "void";

type FreeBetCalculationPreview = {
  lay_commission_1: string | null;
  calculation_state: string;
  calculation_notes: string[];
  base_reference_lay_stake: string | null;
  underlay_reference_lay_stake: string | null;
  overlay_reference_lay_stake: string | null;
  calculated_liability_1: string | null;
  scenario_pnl_if_back_wins: string | null;
  scenario_pnl_if_lay_wins: string | null;
  projected_current_pnl: string | null;
  actual_net_pnl: string | null;
  final_net_pnl: string | null;
  reporting_value: string | null;
  lay_status: string;
  counts_as_open: boolean;
  is_overdue: boolean;
};

type FreeBetRecord = {
  free_bet_id: string;
  profile_id: string;
  event_name: string;
  offer_text: string;
  bookmaker: string;
  offer_type: string;
  bet_type: string;
  offer_name: string;
  fixture_type: string;
  status: string;
  result: string;
  retention_mode: string;
  free_bet_value: string;
  back_odds: string;
  match_strategy: string;
  lay_odds_1: string;
  lay_actual: string;
  lay_matched_stake_1: string;
  lay_commission_1: string;
  exchange_name: string;
  expiry_datetime: string;
  date_settled: string;
  origin_qual_bet_id: string;
  offer_group_id: string;
  user_notes: string;
  manual_override_value: string;
  manual_override_reason: string;
  created_at: string;
  updated_at: string;
  calculation_state: string;
  calculation_notes: string[];
  base_reference_lay_stake: string | null;
  underlay_reference_lay_stake: string | null;
  overlay_reference_lay_stake: string | null;
  calculated_liability_1: string | null;
  scenario_pnl_if_back_wins: string | null;
  scenario_pnl_if_lay_wins: string | null;
  projected_current_pnl: string | null;
  actual_net_pnl: string | null;
  final_net_pnl: string | null;
  reporting_value: string | null;
  lay_status: string;
  counts_as_open: boolean;
  is_overdue: boolean;
};

type FreeBetFormState = {
  free_bet_id?: string;
  event_name: string;
  offer_text: string;
  bookmaker: string;
  offer_type: string;
  bet_type: string;
  offer_name: string;
  fixture_type: string;
  status: string;
  result: string;
  retention_mode: string;
  free_bet_value: string;
  back_odds: string;
  match_strategy: string;
  lay_odds_1: string;
  lay_actual: string;
  lay_matched_stake_1: string;
  lay_commission_1: string;
  exchange_name: string;
  expiry_datetime: string;
  date_settled: string;
  origin_qual_bet_id: string;
  offer_group_id: string;
  user_notes: string;
  manual_override_value: string;
  manual_override_reason: string;
};

type FreeBetOutcomeModalState = {
  rowId: string;
  status: string;
  result: string;
  date_settled: string;
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
  active_date_preset: string;
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
  created_at: string;
  updated_at: string;
};

type FreeBetTableMode =
  | "recent"
  | "settling-soon"
  | "placed"
  | "available"
  | "underlays"
  | "expiring-soon";

type FreeBetIssueFilter =
  | "any"
  | "all-issues"
  | "back-unplaced"
  | "no-settle-date"
  | "outcome-needed"
  | "expiry-watch"
  | "no-expiry";

type FreeBetSortKey = "date_settled" | "bookmaker" | "status" | "displayed_value";
type FreeBetSortDirection = "asc" | "desc";
type FreeBetTableSort = {
  key: FreeBetSortKey;
  direction: FreeBetSortDirection;
};

type FreeBetTableFilterState = {
  bookmaker: string;
  offer_type: string;
  fixture_type: string;
  bet_type: string;
  retention_mode: string;
  match_strategy: string;
  lay_status: string;
  back_bet_status: string;
  status: string;
  issue_type: FreeBetIssueFilter;
  min_value: string;
  max_value: string;
};

const freeBetPlaceholderStatuses = new Set(["Prospecting", "Available", "Not Yet Awarded"]);

function parseFreeBetAmount(value: string | null | undefined): number {
  if (!value?.trim()) {
    return 0;
  }

  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseNumericInput(value: string | null | undefined): number | null {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function getDisplayedValue(
  calculation: Pick<
    FreeBetCalculationPreview,
    "projected_current_pnl" | "final_net_pnl" | "reporting_value"
  > | null,
  fallback: Pick<
    FreeBetRecord,
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
    FreeBetCalculationPreview,
    "projected_current_pnl" | "final_net_pnl" | "reporting_value"
  > | null,
  fallback: Pick<
    FreeBetRecord,
    "projected_current_pnl" | "final_net_pnl" | "reporting_value"
  > | null
): string {
  if (calculation?.final_net_pnl ?? fallback?.final_net_pnl) {
    return "Final value";
  }
  return "Current value";
}

function getDisplayedValueForRow(
  row: Pick<FreeBetRecord, "projected_current_pnl" | "final_net_pnl" | "reporting_value">
): string {
  return getDisplayedValue(null, row);
}

function getComparableDate(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getCalculationValueSource(
  calculation: Pick<
    FreeBetCalculationPreview,
    "projected_current_pnl" | "final_net_pnl" | "reporting_value"
  > | null,
  fallback: Pick<
    FreeBetRecord,
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

function getFreeBetBackLabel(result: string): string {
  return result === "Pending" ? "Back wins" : "Back won";
}

function getFreeBetLayLabel(result: string, isNoLayStrategy: boolean): string {
  if (isNoLayStrategy) {
    return result === "Pending" ? "Back loses" : "Back lost";
  }
  return result === "Pending" ? "Lay wins" : "Lay won";
}

function getFreeBetResultLabel(result: string, isNoLayStrategy: boolean): string {
  if (result === "Pending") {
    return isNoLayStrategy ? "Pending no-lay outcome" : "Pending";
  }
  if (result === "Back Won" || result === "Win") {
    return "Back won";
  }
  if (result === "Lay Won" || result === "Lose") {
    return isNoLayStrategy ? "Back lost" : "Lay won";
  }
  if (result === "Void") {
    return "Void";
  }
  return result;
}

function getPlaceholderGuidance(status: string): string {
  if (status === "Not Yet Awarded") {
    return "Await award before planning the conversion.";
  }
  if (status === "Prospecting") {
    return "Row is prospecting only; no bankroll value is carried yet.";
  }
  return "Add a matching plan when the free bet is ready to convert.";
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

function getFreeBetRangeAnchor(
  row: Pick<FreeBetRecord, "date_settled" | "expiry_datetime" | "created_at">
): Date | null {
  return (
    parseDateValue(row.date_settled) ??
    parseDateValue(row.expiry_datetime) ??
    parseDateValue(row.created_at)
  );
}

function getOutcomeCardState(
  result: string,
  key: "back" | "lay"
): FreeBetOutcomeCardState {
  if (result === "Pending") {
    return "possible";
  }
  if (result === "Void") {
    return "void";
  }
  const hitKey =
    result === "Back Won" || result === "Win"
      ? "back"
      : result === "Lay Won" || result === "Lose"
        ? "lay"
        : null;
  if (hitKey === null) {
    return "possible";
  }
  return hitKey === key ? "hit" : "missed";
}

function getOutcomeCardLabel(state: FreeBetOutcomeCardState): string {
  if (state === "hit") {
    return "Outcome hit";
  }
  if (state === "missed") {
    return "Outcome missed";
  }
  if (state === "void") {
    return "Outcome void";
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
    return "Calculated";
  }
  return "Draft";
}

function getCalculationStateChipClassName(state: string | null | undefined): string {
  if (state === "resolved") {
    return "table-chip table-chip-lay-full";
  }
  if (state === "review_required" || state === "incomplete") {
    return "table-chip table-chip-warning";
  }
  return "table-chip";
}

function getFreeBetResultOptions(strategy: string): string[] {
  if (strategy === "No Lay") {
    return ["Pending", "Back Won", "Win", "Lose", "Void"];
  }

  return [...freeBetResultOptions];
}

function getFreeBetCalculatorMissingFields(
  formState: FreeBetFormState,
  resolvedCommission: string
): string[] {
  const missing: string[] = [];

  if (parseNumericInput(formState.free_bet_value) === null) {
    missing.push("Free-bet value");
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

  return missing;
}

type FreeBetColumnKey =
  | "date_settled"
  | "expiry_datetime"
  | "bookmaker"
  | "offer_name"
  | "event_name"
  | "offer_details"
  | "match_strategy"
  | "lay_status"
  | "back_bet_status"
  | "displayed_value"
  | "status"
  | "actions";

const freeBetTableColumns: TableColumn[] = [
  { key: "date_settled", label: "Settles" },
  { key: "expiry_datetime", label: "Expiry" },
  { key: "bookmaker", label: "Bookmaker" },
  { key: "offer_name", label: "Campaign Tag" },
  { key: "event_name", label: "Event" },
  { key: "offer_details", label: "Offer details" },
  { key: "match_strategy", label: "Strategy" },
  { key: "lay_status", label: "Lay Bet" },
  { key: "back_bet_status", label: "Back Bet" },
  { key: "displayed_value", label: "Value", align: "end" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions" },
];

const defaultVisibleFreeBetColumns = new Set<FreeBetColumnKey>([
  "date_settled",
  "expiry_datetime",
  "bookmaker",
  "offer_name",
  "event_name",
  "offer_details",
  "match_strategy",
  "lay_status",
  "back_bet_status",
  "displayed_value",
  "status",
  "actions",
]);

const hideableFreeBetColumnKeys = new Set<FreeBetColumnKey>([
  "date_settled",
  "expiry_datetime",
  "bookmaker",
  "offer_name",
  "event_name",
  "offer_details",
  "match_strategy",
]);

const defaultFreeBetColumnWidths: Record<FreeBetColumnKey, number> = {
  date_settled: 190,
  expiry_datetime: 180,
  bookmaker: 130,
  offer_name: 170,
  event_name: 220,
  offer_details: 230,
  match_strategy: 150,
  lay_status: 120,
  back_bet_status: 130,
  displayed_value: 130,
  status: 135,
  actions: 110,
};

const freeBetTableModes: Array<{ value: FreeBetTableMode; label: string }> = [
  { value: "recent", label: "Recent" },
  { value: "settling-soon", label: "Settling soon" },
  { value: "placed", label: "Placed" },
  { value: "available", label: "Available" },
  { value: "underlays", label: "Underlays" },
  { value: "expiring-soon", label: "Expiring soon" },
];

const emptyTableFilters: FreeBetTableFilterState = {
  bookmaker: "",
  offer_type: "",
  fixture_type: "",
  bet_type: "",
  retention_mode: "",
  match_strategy: "",
  lay_status: "",
  back_bet_status: "",
  status: "",
  issue_type: "any",
  min_value: "",
  max_value: "",
};

function parseCurrencyLikeValue(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized.replace(/[£,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function getFreeBetOfferDetailsTokens(
  row: Pick<FreeBetRecord, "offer_type" | "fixture_type" | "bet_type" | "retention_mode">
): string[] {
  return [row.offer_type, row.fixture_type, row.bet_type, row.retention_mode]
    .map((value) => getCompactLedgerLabel(value))
    .filter(Boolean);
}

function getCompactLedgerLabel(value: string): string {
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

function getFreeBetStrategyToneClass(strategy: string): string {
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

function getFreeBetBackBetStatusBadge(
  row: Pick<FreeBetRecord, "status" | "result">
): { label: string; tone: "muted" | "positive" | "warning" } {
  if (row.status === "Prospecting" || row.status === "Not Yet Awarded") {
    return { label: "Not Placed", tone: "muted" };
  }

  if (row.status === "Available") {
    return { label: "Awarded", tone: "warning" };
  }

  return { label: "Back Placed", tone: "positive" };
}

function isFreeBetExpiryRelevantRow(
  row: Pick<FreeBetRecord, "status" | "result">
): boolean {
  return row.status !== "Settled" && freeBetPlaceholderStatuses.has(row.status) && row.result === "Pending";
}

function getFreeBetIssueBadges(
  row: Pick<
    FreeBetRecord,
    "status" | "result" | "date_settled" | "expiry_datetime" | "is_overdue" | "counts_as_open"
  >
): Array<{ label: string; tone: "info" | "orange" | "warning" | "danger" }> {
  const issues: Array<{ label: string; tone: "info" | "orange" | "warning" | "danger" }> = [];
  const expiryRelevant = isFreeBetExpiryRelevantRow(row);

  if (row.status === "Prospecting" || row.status === "Not Yet Awarded") {
    issues.push({ label: "Back Unplaced", tone: "warning" });
  }

  if (!row.date_settled.trim()) {
    issues.push({ label: "No Settle Date", tone: "warning" });
  }

  if (row.status === "Placed" && row.result === "Pending" && row.is_overdue && row.date_settled.trim()) {
    issues.push({ label: "Outcome Needed", tone: "danger" });
  }

  if (expiryRelevant) {
    if (!row.expiry_datetime.trim()) {
      issues.push({ label: "No Expiry", tone: "info" });
    } else {
      const expiryTimestamp = Date.parse(row.expiry_datetime);
      if (Number.isFinite(expiryTimestamp)) {
        const hoursUntilExpiry = (expiryTimestamp - Date.now()) / 3_600_000;

        if (hoursUntilExpiry > 0 && hoursUntilExpiry <= 24) {
          issues.push({ label: "Expiry < 24h", tone: "danger" });
        } else if (hoursUntilExpiry > 24 && hoursUntilExpiry <= 72) {
          issues.push({ label: "Expiry < 3d", tone: "warning" });
        } else if (hoursUntilExpiry > 72 && hoursUntilExpiry <= 168) {
          issues.push({ label: "Expiry This Week", tone: "orange" });
        }
      }
    }
  }

  return issues;
}

function getFreeBetIssueTone(
  row: Pick<
    FreeBetRecord,
    "status" | "result" | "date_settled" | "expiry_datetime" | "is_overdue" | "counts_as_open"
  >
): "info" | "orange" | "warning" | "danger" | null {
  const issues = getFreeBetIssueBadges(row);
  if (issues.length === 0) {
    return null;
  }
  if (issues.some((issue) => issue.tone === "danger")) {
    return "danger";
  }
  if (issues.some((issue) => issue.tone === "warning")) {
    return "warning";
  }
  if (issues.some((issue) => issue.tone === "orange")) {
    return "orange";
  }
  return "info";
}

function getFreeBetIssueFilterMatch(row: FreeBetRecord, issueType: FreeBetIssueFilter): boolean {
  if (issueType === "any") {
    return true;
  }

  const labels = new Set(getFreeBetIssueBadges(row).map((badge) => badge.label));
  if (issueType === "all-issues") {
    return labels.size > 0;
  }
  if (issueType === "back-unplaced") {
    return labels.has("Back Unplaced");
  }
  if (issueType === "no-settle-date") {
    return labels.has("No Settle Date");
  }
  if (issueType === "outcome-needed") {
    return labels.has("Outcome Needed");
  }
  if (issueType === "expiry-watch") {
    return (
      labels.has("Expiry This Week") ||
      labels.has("Expiry < 3d") ||
      labels.has("Expiry < 24h")
    );
  }
  if (issueType === "no-expiry") {
    return labels.has("No Expiry");
  }
  return true;
}

function isSortableFreeBetColumn(columnKey: string): columnKey is FreeBetSortKey {
  return (
    columnKey === "date_settled" ||
    columnKey === "bookmaker" ||
    columnKey === "status" ||
    columnKey === "displayed_value"
  );
}

function createBlankForm(): FreeBetFormState {
  return {
    event_name: "",
    offer_text: "",
    bookmaker: "",
    offer_type: "",
    bet_type: "",
    offer_name: "",
    fixture_type: "",
    status: "Prospecting",
    result: "Pending",
    retention_mode: "SNR",
    free_bet_value: "",
    back_odds: "",
    match_strategy: "Standard",
    lay_odds_1: "",
    lay_actual: "",
    lay_matched_stake_1: "",
    lay_commission_1: "",
    exchange_name: "",
    expiry_datetime: "",
    date_settled: "",
    origin_qual_bet_id: "",
    offer_group_id: "",
    user_notes: "",
    manual_override_value: "",
    manual_override_reason: ""
  };
}

function recordToForm(record: FreeBetRecord): FreeBetFormState {
  return {
    free_bet_id: record.free_bet_id,
    event_name: record.event_name,
    offer_text: record.offer_text,
    bookmaker: record.bookmaker,
    offer_type: record.offer_type,
    bet_type: record.bet_type,
    offer_name: record.offer_name,
    fixture_type: record.fixture_type,
    status: record.status,
    result: record.result,
    retention_mode: record.retention_mode,
    free_bet_value: record.free_bet_value,
    back_odds: record.back_odds,
    match_strategy: record.match_strategy,
    lay_odds_1: record.lay_odds_1,
    lay_actual: record.lay_actual,
    lay_matched_stake_1: record.lay_matched_stake_1,
    lay_commission_1: record.lay_commission_1,
    exchange_name: record.exchange_name,
    expiry_datetime: toDateTimeLocalValue(record.expiry_datetime),
    date_settled: toDateTimeLocalValue(record.date_settled),
    origin_qual_bet_id: record.origin_qual_bet_id,
    offer_group_id: record.offer_group_id,
    user_notes: record.user_notes,
    manual_override_value: record.manual_override_value,
    manual_override_reason: record.manual_override_reason
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

function applyStrategyDefaults(
  current: FreeBetFormState,
  nextStrategy: string
): FreeBetFormState {
  const nextResultOptions = new Set(getFreeBetResultOptions(nextStrategy));

  if (nextStrategy === "No Lay") {
    return {
      ...current,
      match_strategy: nextStrategy,
      result: nextResultOptions.has(current.result) ? current.result : "Pending",
      exchange_name: "",
      lay_odds_1: "",
      lay_actual: "",
      lay_matched_stake_1: "",
    };
  }

  return {
    ...current,
    match_strategy: nextStrategy,
    result: nextResultOptions.has(current.result) ? current.result : "Pending",
  };
}

function applyBetTypeDefaults(
  current: FreeBetFormState,
  nextBetType: string
): FreeBetFormState {
  return {
    ...current,
    bet_type: normalizeSportsbookBetType(nextBetType),
  };
}

function applyOfferTypeDefaults(
  current: FreeBetFormState,
  nextOfferType: string
): FreeBetFormState {
  return {
    ...current,
    offer_type: nextOfferType,
    bet_type: getDefaultBetTypeForOfferType(nextOfferType, current.bet_type),
  };
}

function applyResultDefaults(
  current: FreeBetFormState,
  nextResult: string
): FreeBetFormState {
  const nextStatus =
    nextResult === "Pending"
      ? current.status === "Settled" || current.status === "Expired" || current.status === "Void"
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

function getMissingRequiredFields(formState: FreeBetFormState): string[] {
  const missing: string[] = [];
  if (!formState.offer_type.trim()) {
    missing.push("Offer type");
  }
  if (!formState.event_name.trim()) {
    missing.push("Event name");
  }
  if (!formState.bookmaker.trim()) {
    missing.push("Bookmaker");
  }
  return missing;
}

function getMissingPlacementFields(
  formState: FreeBetFormState,
  resolvedCommission: string
): string[] {
  if (freeBetPlaceholderStatuses.has(formState.status)) {
    return [];
  }

  const requiresPlacedPlan =
    formState.status === "Placed" ||
    formState.status === "Settled" ||
    formState.status === "Converted" ||
    formState.result !== "Pending";

  if (!requiresPlacedPlan) {
    return [];
  }

  return getFreeBetCalculatorMissingFields(formState, resolvedCommission).concat(
    (formState.status === "Settled" || formState.result !== "Pending") && !formState.date_settled.trim()
      ? ["Settles"]
      : []
  );
}

function applyStatusDefaults(
  current: FreeBetFormState,
  nextStatus: string
): FreeBetFormState {
  if (
    nextStatus === "Prospecting" ||
    nextStatus === "Available" ||
    nextStatus === "Placed" ||
    nextStatus === "Not Yet Awarded"
  ) {
    return {
      ...current,
      status: nextStatus,
      result: "Pending",
    };
  }

  if (nextStatus === "Expired" || nextStatus === "Void") {
    return {
      ...current,
      status: nextStatus,
      result: nextStatus === "Void" ? "Void" : "Pending",
    };
  }

  if (nextStatus === "Converted" || nextStatus === "Settled") {
    return {
      ...current,
      status: nextStatus,
    };
  }

  return {
    ...current,
    status: nextStatus,
  };
}

function applyOutcomeModalResultDefaults(
  current: FreeBetOutcomeModalState,
  nextResult: string
): FreeBetOutcomeModalState {
  const nextStatus =
    nextResult === "Pending"
      ? current.status === "Settled" || current.status === "Expired" || current.status === "Void"
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
  current: FreeBetOutcomeModalState,
  nextStatus: string
): FreeBetOutcomeModalState {
  if (
    nextStatus === "Prospecting" ||
    nextStatus === "Available" ||
    nextStatus === "Placed" ||
    nextStatus === "Not Yet Awarded"
  ) {
    return {
      ...current,
      status: nextStatus,
      result: "Pending",
    };
  }

  if (nextStatus === "Expired" || nextStatus === "Void") {
    return {
      ...current,
      status: nextStatus,
      result: nextStatus === "Void" ? "Void" : "Pending",
    };
  }

  if (nextStatus === "Converted" || nextStatus === "Settled") {
    return {
      ...current,
      status: nextStatus,
    };
  }

  return {
    ...current,
    status: nextStatus,
  };
}

function getResolvedExchangeCommission(
  exchangeSettings: ExchangeCommissionRecord[],
  exchangeName: string
): string {
  return exchangeSettings.find((row) => row.exchange_name === exchangeName)?.commission_rate ?? "";
}

function truncateHeaderTitle(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 4)).trimEnd()} ...`;
}

export function FreeBetWorkflowShell({
  profileId,
  initialTableMode,
  initialQuery = "",
  initialIssueFilter,
}: {
  profileId: string;
  initialTableMode?: string;
  initialQuery?: string;
  initialIssueFilter?: string;
}) {
  const { catalogue: bookmakerCatalogue, displaySettings: bookmakerDisplaySettings } =
    useBookmakerCatalogue(profileId);
  const [rows, setRows] = useState<FreeBetRecord[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [accountAuthorities, setAccountAuthorities] = useState<AccountAuthorityRecord[]>([]);
  const [exchangeSettings, setExchangeSettings] = useState<ExchangeCommissionRecord[]>([]);
  const [trackerSettings, setTrackerSettings] = useState<TrackerSettingsRecord | null>(null);
  const [lookupValues, setLookupValues] = useState<LookupValueRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workflowVisible, setWorkflowVisible] = useState(false);
  const [tableCollapsed, setTableCollapsed] = usePersistedBoolean(
    `openforge-ledger-collapsed:${profileId}:free-bets`,
    false
  );
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<FreeBetColumnKey>>(
    () => new Set(defaultVisibleFreeBetColumns)
  );
  const [columnWidths, setColumnWidths] = useState<Partial<Record<FreeBetColumnKey, number>>>(
    defaultFreeBetColumnWidths
  );
  const [tableFilters, setTableFilters] = usePersistedState<FreeBetTableFilterState>(
    `openforge-ledger-table-filters:${profileId}:free-bets`,
    {
      ...emptyTableFilters,
      issue_type: initialIssueFilter === "outcome-needed" ? "outcome-needed" : initialIssueFilter === "all-issues" ? "all-issues" : "any",
    },
    Boolean(initialIssueFilter)
  );
  const [tableSort, setTableSort] = useState<FreeBetTableSort | null>(null);
  const [formState, setFormState] = useState<FreeBetFormState>(createBlankForm);
  const [pristineFormState, setPristineFormState] = useState<FreeBetFormState>(createBlankForm);
  const [outcomeModalState, setOutcomeModalState] = useState<FreeBetOutcomeModalState | null>(null);
  const [tableMode, setTableMode] = usePersistedState<FreeBetTableMode>(
    `openforge-ledger-table-mode:${profileId}:free-bets`,
    freeBetTableModes.some((mode) => mode.value === initialTableMode)
      ? (initialTableMode as FreeBetTableMode)
      : "recent",
    Boolean(initialTableMode || initialIssueFilter)
  );
  const [query, setQuery] = useState(initialQuery);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [previewCalculation, setPreviewCalculation] = useState<FreeBetCalculationPreview | null>(null);
  const [showOfferIdentityValidation, setShowOfferIdentityValidation] = useState(false);
  const [settledEditEnabled, setSettledEditEnabled] = useState(false);
  const [isPending, startTransition] = useTransition();
  const editorRef = useRef<HTMLElement | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const isCreatingDraftRef = useRef(false);
  const pageSize = 8;
  const isDirty = useMemo(
    () => JSON.stringify(formState) !== JSON.stringify(pristineFormState),
    [formState, pristineFormState]
  );
  const confirmDiscardChanges = useUnsavedChangesGuard(isDirty);
  const clearStatusMessage = useCallback(() => setStatusMessage(""), []);
  const tableColumns = useMemo(
    () =>
      freeBetTableColumns.filter((column) =>
        visibleColumnKeys.has(column.key as FreeBetColumnKey)
      ),
    [visibleColumnKeys]
  );
  const hiddenColumnCount = useMemo(
    () =>
      Array.from(hideableFreeBetColumnKeys).filter((columnKey) => !visibleColumnKeys.has(columnKey))
        .length,
    [visibleColumnKeys]
  );
  const activeFilterCount = useMemo(
    () =>
      Object.entries(tableFilters).filter(([key, value]) => {
        if (key === "issue_type") {
          return value !== "any";
        }
        return Boolean(String(value).trim());
      }).length,
    [tableFilters]
  );
  const hasActiveTableControls = hiddenColumnCount > 0 || tableMode !== "recent" || activeFilterCount > 0;
  const activeTableControlCount = hiddenColumnCount + activeFilterCount + (tableMode !== "recent" ? 1 : 0);

  useToastDismiss(statusMessage, clearStatusMessage);
  useDialogFocusLifecycle(workflowVisible, editorRef);

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

  const loadRows = useCallback(async (preferredSelection?: string | null) => {
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/free-bets`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Unable to load free-bet rows");
    }

    const nextRows = (await response.json()) as FreeBetRecord[];
    startTransition(() => {
      setRows(nextRows);
      setIsInitialLoading(false);
      const nextSelectedCandidate =
        preferredSelection === undefined ? selectedIdRef.current : preferredSelection;
      const selected =
        nextSelectedCandidate &&
        nextRows.some((row) => row.free_bet_id === nextSelectedCandidate)
          ? nextSelectedCandidate
          : null;
      setSelectedId(selected);
      if (selected) {
        isCreatingDraftRef.current = false;
        const activeRecord = nextRows.find((row) => row.free_bet_id === selected);
        if (activeRecord) {
          const nextFormState = recordToForm(activeRecord);
          setFormState(nextFormState);
          setPristineFormState(nextFormState);
          setShowOfferIdentityValidation(false);
          setSettledEditEnabled(false);
        }
        setWorkflowVisible(true);
      } else {
        if (isCreatingDraftRef.current) {
          setWorkflowVisible(true);
          return;
        }
        const blankForm = createBlankForm();
        setFormState(blankForm);
        setPristineFormState(blankForm);
        setShowOfferIdentityValidation(false);
        setSettledEditEnabled(false);
        setWorkflowVisible(false);
      }
    });
  }, [profileId, startTransition]);

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
      throw new Error("Unable to load tracker settings");
    }
    const nextSettings = (await response.json()) as TrackerSettingsRecord;
    setTrackerSettings(nextSettings);
  }, [profileId]);

  const applySportsbookPrefill = useCallback((): boolean => {
    const storageKey = `openforge:free-bet-prefill:${profileId}`;
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(storageKey);
    } catch {
      return false;
    }

    if (!raw) {
      return false;
    }

    let prefill: Record<string, string>;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return false;
      }
      prefill = parsed as Record<string, string>;
    } catch {
      return false;
    }

    const blankForm = createBlankForm();
    const nextForm: FreeBetFormState = {
      ...blankForm,
      bookmaker: String(prefill.bookmaker ?? ""),
      offer_type: String(prefill.offer_type ?? ""),
      bet_type: String(prefill.bet_type ?? ""),
      offer_name: String(prefill.offer_name ?? ""),
      fixture_type: String(prefill.fixture_type ?? ""),
      event_name: String(prefill.event_name ?? ""),
      free_bet_value: String(prefill.free_bet_value ?? ""),
      expiry_datetime: String(prefill.expiry_datetime ?? ""),
      retention_mode: String(prefill.retention_mode ?? "SNR"),
      status: String(prefill.status ?? "Not Yet Awarded"),
    };

    setSelectedId(null);
    setFormState(nextForm);
    setPristineFormState(nextForm);
    setShowOfferIdentityValidation(false);
    setSettledEditEnabled(false);
    setWorkflowVisible(true);
    setTableCollapsed(false);
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // sessionStorage unavailable
    }
    setStatusMessage(
      `Pre-filled from sportsbook row ${String(prefill.from_sportsbook_bet_id ?? "")}. Review and save the free bet.`
    );
    scrollToElementTopAfterRender(() => editorRef.current);
    return true;
  }, [profileId, setTableCollapsed]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void Promise.all([
        loadRows(),
        loadExchangeSettings(),
        loadTrackerSettings(),
        loadAccountAuthorities(),
        loadLookupValues(),
      ])
        .then(() => {
          applySportsbookPrefill();
        })
        .catch((error: Error) => {
          setIsInitialLoading(false);
          setErrorMessage(error.message);
          setStatusMessage("Free-bet workflow could not be loaded.");
        });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    applySportsbookPrefill,
    loadAccountAuthorities,
    loadExchangeSettings,
    loadLookupValues,
    loadRows,
    loadTrackerSettings,
  ]);

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

  const exchangeOptions = useMemo(
    () =>
      dedupeOptions([
        ...exchangeSettings.map((row) => row.exchange_name),
        ...getAccountNamesByType(accountAuthorities, "Exchange"),
        ...getLookupValuesByType(lookupValues, "exchange"),
        ...rows.map((row) => row.exchange_name),
        formState.exchange_name,
      ]),
    [accountAuthorities, exchangeSettings, formState.exchange_name, lookupValues, rows]
  );
  const resolvedCommission = useMemo(
    () => getResolvedExchangeCommission(exchangeSettings, formState.exchange_name),
    [exchangeSettings, formState.exchange_name]
  );
  const resolvedDateRange = useMemo(
    () =>
      resolveDateRange({
        preset: (trackerSettings?.active_date_preset as DatePreset | undefined) ?? "Week (Mon-Sun)",
        customStart: trackerSettings?.custom_start_date,
        customEnd: trackerSettings?.custom_end_date,
        rangeBackDays: trackerSettings?.range_back_days,
        rangeForwardDays: trackerSettings?.range_forward_days,
      }),
    [trackerSettings]
  );

  const isNoLayStrategy = formState.match_strategy === "No Lay";
  const showsLayMatchedStake =
    formState.match_strategy === "Partial Lay" || formState.match_strategy === "Custom";
  const isPlaceholderStatus = freeBetPlaceholderStatuses.has(formState.status);
  const selectedRow = useMemo(
    () => rows.find((row) => row.free_bet_id === selectedId) ?? null,
    [rows, selectedId]
  );
  const isSettledBet = selectedRow?.status === "Settled";
  const isSettledReadOnly = Boolean(isSettledBet && !settledEditEnabled);
  const isAwaitingAwardStatus = formState.status === "Not Yet Awarded";
  const calculatorLockReason = isAwaitingAwardStatus
    ? "Await free-bet issue"
    : "Complete offer setup";
  const offerSetupComplete = Boolean(
    formState.offer_type.trim() &&
      formState.event_name.trim() &&
      formState.bookmaker.trim()
  );
  const calculatorUnlocked = offerSetupComplete && !isAwaitingAwardStatus;
  const previewReady = Boolean(
    calculatorUnlocked &&
      formState.offer_type.trim() &&
      formState.event_name.trim() &&
      formState.bookmaker.trim()
  );
  const activePreviewCalculation = previewReady ? previewCalculation : null;

  const missingOfferIdentityFields = useMemo(
    () => getMissingRequiredFields(formState),
    [formState]
  );
  const offerIdentityValidationActive = showOfferIdentityValidation;
  const resultOptions = useMemo(
    () => getFreeBetResultOptions(formState.match_strategy),
    [formState.match_strategy]
  );
  const missingPlacementFields = useMemo(
    () => getMissingPlacementFields(formState, resolvedCommission),
    [formState, resolvedCommission]
  );
  const missingCalculatorFields = useMemo(
    () => getFreeBetCalculatorMissingFields(formState, resolvedCommission),
    [formState, resolvedCommission]
  );
  const hasOutcomePreview = Boolean(
    activePreviewCalculation?.scenario_pnl_if_back_wins ??
      selectedRow?.scenario_pnl_if_back_wins ??
      activePreviewCalculation?.scenario_pnl_if_lay_wins ??
      selectedRow?.scenario_pnl_if_lay_wins
  );
  const activeSuggestedLay =
    formState.match_strategy === "Underlay"
      ? activePreviewCalculation?.underlay_reference_lay_stake ??
        selectedRow?.underlay_reference_lay_stake ??
        "—"
      : formState.match_strategy === "Overlay"
        ? activePreviewCalculation?.overlay_reference_lay_stake ??
          selectedRow?.overlay_reference_lay_stake ??
          "—"
        : activePreviewCalculation?.base_reference_lay_stake ??
          selectedRow?.base_reference_lay_stake ??
          "—";
  const activeCalculationState =
    activePreviewCalculation?.calculation_state ?? selectedRow?.calculation_state ?? null;
  const activeCalculationNotes =
    activePreviewCalculation?.calculation_notes.length
      ? activePreviewCalculation.calculation_notes
      : selectedRow?.calculation_notes ?? [];
  const visibleCalculationNotes = activeCalculationNotes.filter(
    (note) => note !== "Pending row uses projected current value until settlement."
  );
  const isCalculatedState = activeCalculationState === "resolved";
  const calculatorRuleItems = useMemo(() => {
    const items: string[] = [];

    if (formState.status === "Not Yet Awarded") {
      items.push("Not Yet Awarded: wait until the free bet is issued before planning conversion.");
    }

    if (formState.match_strategy === "No Lay") {
      items.push("No lay: exchange inputs stay hidden and the row resolves from back-win versus back-loss only.");
    } else if (formState.match_strategy === "Custom" || formState.match_strategy === "Partial Lay") {
      items.push("Manual lay path: confirm the lay side explicitly instead of relying only on the suggestion.");
    } else {
      items.push("Standard conversion: current value stays conservative while suggested lays guide the matching choice.");
    }

    items.push(`Retention mode ${formState.retention_mode || "pending"}.`);
    if (trackerSettings) {
      items.push(
        `Profile defaults: underlay ${trackerSettings.default_free_bet_underlay_factor} • overlay ${trackerSettings.default_free_bet_overlay_factor}.`
      );
    }

    return items;
  }, [formState.match_strategy, formState.retention_mode, formState.status, trackerSettings]);

  useEffect(() => {
    if (!previewReady) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetch(`${apiBaseUrl}/profiles/${profileId}/free-bets/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formState,
          lay_commission_1: "",
          expiry_datetime: fromDateTimeLocalValue(formState.expiry_datetime),
          date_settled: fromDateTimeLocalValue(formState.date_settled),
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(await response.text());
          }
          return (await response.json()) as FreeBetCalculationPreview;
        })
        .then((payload) => setPreviewCalculation(payload))
        .catch(() => setPreviewCalculation(null));
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [formState, previewReady, profileId]);

  const reviewRows = useMemo(() => {
    const nextRows = [...rows];

    if (tableMode === "placed") {
      return nextRows
        .filter((row) => row.status === "Placed")
        .sort((left, right) => {
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

    if (tableMode === "available") {
      return nextRows
        .filter((row) => freeBetPlaceholderStatuses.has(row.status))
        .sort((left, right) => {
          if (left.is_overdue !== right.is_overdue) {
            return left.is_overdue ? -1 : 1;
          }

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

    if (tableMode === "expiring-soon") {
      return nextRows
        .filter((row) => isFreeBetExpiryRelevantRow(row))
        .sort((left, right) => {
          const leftMissingExpiry = !left.expiry_datetime.trim();
          const rightMissingExpiry = !right.expiry_datetime.trim();

          if (leftMissingExpiry !== rightMissingExpiry) {
            return leftMissingExpiry ? -1 : 1;
          }

          if (left.is_overdue !== right.is_overdue) {
            return left.is_overdue ? -1 : 1;
          }

          const leftExpiry = getComparableDate(left.expiry_datetime);
          const rightExpiry = getComparableDate(right.expiry_datetime);

          if (leftExpiry === null && rightExpiry === null) {
            const rightCreated = getComparableDate(right.created_at) ?? 0;
            const leftCreated = getComparableDate(left.created_at) ?? 0;
            return rightCreated - leftCreated;
          }

          if (leftExpiry === null) {
            return 1;
          }

          if (rightExpiry === null) {
            return -1;
          }

          return leftExpiry - rightExpiry;
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

    return nextRows.sort((left, right) => {
      const rightCreated = getComparableDate(right.created_at) ?? 0;
      const leftCreated = getComparableDate(left.created_at) ?? 0;
      return rightCreated - leftCreated;
    });
  }, [rows, tableMode]);

  const toggleColumnVisibility = useCallback(
    (columnKey: FreeBetColumnKey) => {
      if (!hideableFreeBetColumnKeys.has(columnKey)) {
        return;
      }

      setVisibleColumnKeys((current) => {
        const next = new Set(current);
        if (next.has(columnKey)) {
          next.delete(columnKey);
        } else {
          next.add(columnKey);
        }
        return next;
      });
    },
    []
  );

  const startColumnResize = useCallback(
    (
      event: ReactMouseEvent,
      columnKey: FreeBetColumnKey,
      headerCell: HTMLTableCellElement | null
    ) => {
      event.preventDefault();
      event.stopPropagation();

      const startingWidth =
        headerCell?.getBoundingClientRect().width ??
        columnWidths[columnKey] ??
        defaultFreeBetColumnWidths[columnKey];
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
      columnKey: FreeBetColumnKey,
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

  const updateTableFilter = useCallback(
    <TKey extends keyof FreeBetTableFilterState>(key: TKey, value: FreeBetTableFilterState[TKey]) => {
      setTableFilters((current) => ({
        ...current,
        [key]: value,
      }));
      setCurrentPage(1);
    },
    [setTableFilters]
  );

  const clearTableFilters = useCallback(() => {
    setTableMode("recent");
    setTableFilters(emptyTableFilters);
    setCurrentPage(1);
  }, [setTableFilters, setTableMode]);

  const toggleTableSort = useCallback((key: FreeBetSortKey) => {
    setTableSort((current) => {
      if (!current || current.key !== key) {
        return { key, direction: "asc" };
      }
      return { key, direction: current.direction === "asc" ? "desc" : "asc" };
    });
  }, []);

  const sortedReviewRows = useMemo(() => {
    if (!tableSort) {
      return reviewRows;
    }

    const nextRows = [...reviewRows];
    nextRows.sort((left, right) => {
      const direction = tableSort.direction === "asc" ? 1 : -1;

      if (tableSort.key === "date_settled") {
        const leftValue = getComparableDate(left.date_settled) ?? Number.POSITIVE_INFINITY;
        const rightValue = getComparableDate(right.date_settled) ?? Number.POSITIVE_INFINITY;
        return (leftValue - rightValue) * direction;
      }

      if (tableSort.key === "displayed_value") {
        const leftValue = parseFreeBetAmount(
          left.reporting_value ?? left.final_net_pnl ?? left.projected_current_pnl
        );
        const rightValue = parseFreeBetAmount(
          right.reporting_value ?? right.final_net_pnl ?? right.projected_current_pnl
        );
        return (leftValue - rightValue) * direction;
      }

      const leftValue = String(left[tableSort.key] ?? "").toLowerCase();
      const rightValue = String(right[tableSort.key] ?? "").toLowerCase();
      return leftValue.localeCompare(rightValue, "en-GB") * direction;
    });

    return nextRows;
  }, [reviewRows, tableSort]);

  const freeBetRowsById = useMemo(
    () => new Map(rows.map((row) => [row.free_bet_id, row])),
    [rows]
  );

  const freeBetFilterOptions = useMemo(() => {
    const backBetStatuses = dedupeOptions(
      rows.map((row) => getFreeBetBackBetStatusBadge(row).label)
    );

    return {
      bookmakers: dedupeOptions(rows.map((row) => row.bookmaker)),
      offerTypes: dedupeOptions(rows.map((row) => row.offer_type)),
      fixtureTypes: dedupeOptions(rows.map((row) => row.fixture_type)),
      betTypes: dedupeOptions(rows.map((row) => row.bet_type)),
      retentionModes: dedupeOptions(rows.map((row) => row.retention_mode)),
      strategies: dedupeOptions(rows.map((row) => row.match_strategy)),
      layStatuses: dedupeOptions(rows.map((row) => row.lay_status)),
      backBetStatuses,
      statuses: dedupeOptions(rows.map((row) => row.status)),
    };
  }, [rows]);

  const filteredSourceRows = useMemo(() => {
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
      if (tableFilters.retention_mode && row.retention_mode !== tableFilters.retention_mode) {
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
        getFreeBetBackBetStatusBadge(row).label !== tableFilters.back_bet_status
      ) {
        return false;
      }
      if (tableFilters.status && row.status !== tableFilters.status) {
        return false;
      }
      if (!getFreeBetIssueFilterMatch(row, tableFilters.issue_type)) {
        return false;
      }

      const rowValue = parseFreeBetAmount(
        row.reporting_value ?? row.final_net_pnl ?? row.projected_current_pnl
      );
      const minValue = parseCurrencyLikeValue(tableFilters.min_value);
      const maxValue = parseCurrencyLikeValue(tableFilters.max_value);
      if (minValue !== null && rowValue < minValue) {
        return false;
      }
      if (maxValue !== null && rowValue > maxValue) {
        return false;
      }

      return true;
    });
  }, [sortedReviewRows, tableFilters]);

  const filteredRows = useMemo(() => {
    const tableRows: TrackerRow[] = filteredSourceRows.map((row) => ({
      free_bet_id: row.free_bet_id,
      date_settled: formatDisplayDate(row.date_settled),
      bookmaker: row.bookmaker,
      offer_name: row.offer_name,
      event_name: row.event_name,
      expiry_datetime: formatDisplayDate(row.expiry_datetime),
      offer_details: getFreeBetOfferDetailsTokens(row).join(" • "),
      match_strategy: row.match_strategy,
      lay_status: row.lay_status,
      back_bet_status: getFreeBetBackBetStatusBadge(row).label,
      displayed_value: getDisplayedValueForRow(row),
      displayed_value_label: getDisplayedValueLabel(null, row),
      status: row.status,
      actions: "Actions",
      offer_type: row.offer_type,
      fixture_type: row.fixture_type,
      bet_type: row.bet_type,
      retention_mode: row.retention_mode,
      calculation_state: row.calculation_state,
    }));

    return filterTrackerRows(tableRows, freeBetTableColumns, query);
  }, [filteredSourceRows, query]);

  const quickView = useMemo(() => {
    const rangeRows = rows.filter((row) =>
      isDateWithinResolvedRange(getFreeBetRangeAnchor(row), resolvedDateRange)
    );
    const totalReportingValue = rangeRows.reduce(
      (sum, row) => sum + parseFreeBetAmount(row.reporting_value ?? row.final_net_pnl ?? row.projected_current_pnl),
      0
    );
    const expiryWatchRows = rangeRows.filter(
      (row) => freeBetPlaceholderStatuses.has(row.status) && row.result === "Pending"
    );

    return {
      openCount: rangeRows.filter((row) => row.counts_as_open).length,
      overdueCount: rangeRows.filter((row) => row.is_overdue).length,
      placedCount: rangeRows.filter((row) => row.status === "Placed").length,
      availableCount: rangeRows.filter((row) => freeBetPlaceholderStatuses.has(row.status)).length,
      underlayCount: rangeRows.filter((row) => row.match_strategy === "Underlay").length,
      noLayCount: rangeRows.filter((row) => row.match_strategy === "No Lay").length,
      missingExpiryCount: expiryWatchRows.filter((row) => !row.expiry_datetime.trim()).length,
      upcomingExpiryCount: expiryWatchRows.filter((row) => row.expiry_datetime.trim()).length,
      totalReportingValue,
    };
  }, [resolvedDateRange, rows]);

  const pageCount = getTrackerPageCount(filteredRows.length, pageSize);
  const effectivePage = Math.min(currentPage, pageCount);
  const pagedRows = useMemo(
    () => paginateTrackerRows(filteredRows, effectivePage, pageSize),
    [effectivePage, filteredRows]
  );
  const editorHeaderFullTitle = useMemo(() => {
    const offerText = formState.offer_text.trim();
    if (offerText) {
      return offerText;
    }

    const eventName = formState.event_name.trim();
    if (eventName) {
      return eventName;
    }

    return "New free-bet row";
  }, [formState.event_name, formState.offer_text]);
  const editorHeaderTitle = useMemo(
    () => truncateHeaderTitle(editorHeaderFullTitle, 75),
    [editorHeaderFullTitle]
  );

  function selectRow(rowId: string, options?: { collapseTable?: boolean }) {
    if (rowId !== selectedId && isDirty && !confirmDiscardChanges()) {
      return;
    }
    const record = rows.find((entry) => entry.free_bet_id === rowId);
    if (!record) {
      return;
    }
    setSelectedId(rowId);
    isCreatingDraftRef.current = false;
    setPreviewCalculation(null);
    const nextFormState = recordToForm(record);
    setFormState(nextFormState);
    setPristineFormState(nextFormState);
    setErrorMessage("");
    setShowOfferIdentityValidation(false);
    setSettledEditEnabled(false);
    setWorkflowVisible(true);
    setTableCollapsed(Boolean(options?.collapseTable));
    setStatusMessage(`Opened free bet ${rowId} for editing.`);
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
    const blankForm = createBlankForm();
    setFormState(blankForm);
    setPristineFormState(blankForm);
    setErrorMessage("");
    setShowOfferIdentityValidation(false);
    setSettledEditEnabled(false);
    setStatusMessage("New free bet ready. Complete the required fields, then save.");
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await persistForm(formState);
  }

  function canPersistForm(nextFormState: FreeBetFormState): boolean {
    const nextResolvedCommission = getResolvedExchangeCommission(
      exchangeSettings,
      nextFormState.exchange_name
    );
    return (
      getMissingRequiredFields(nextFormState).length === 0 &&
      getMissingPlacementFields(nextFormState, nextResolvedCommission).length === 0
    );
  }

  async function persistForm(
    nextFormState: FreeBetFormState,
    options?: {
      autosaveLabel?: string;
      suppressMissingRequiredMessage?: boolean;
      returnToLedgerOnSuccess?: boolean;
    }
  ): Promise<boolean> {
    setErrorMessage("");
    const nextResolvedCommission = getResolvedExchangeCommission(
      exchangeSettings,
      nextFormState.exchange_name
    );
    if (!canPersistForm(nextFormState)) {
      setShowOfferIdentityValidation(true);
      if (!options?.suppressMissingRequiredMessage) {
        const missingFields = [
          ...getMissingRequiredFields(nextFormState),
          ...getMissingPlacementFields(nextFormState, nextResolvedCommission),
        ];
        setStatusMessage(
          `Complete required free-bet fields before saving: ${missingFields.join(", ")}.`
        );
      }
      return false;
    }

    const activeRowId = nextFormState.free_bet_id ?? selectedId;
    const isEditing = Boolean(activeRowId);
    const url = isEditing
      ? `${apiBaseUrl}/profiles/${profileId}/free-bets/${activeRowId}`
      : `${apiBaseUrl}/profiles/${profileId}/free-bets`;
    const method = isEditing ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...nextFormState,
        lay_commission_1: "",
        expiry_datetime: fromDateTimeLocalValue(nextFormState.expiry_datetime),
        date_settled: fromDateTimeLocalValue(nextFormState.date_settled),
      })
    });

    if (!response.ok) {
      setErrorMessage(await response.text());
      return false;
    }

    const saved = (await response.json()) as FreeBetRecord;
    await loadRows(saved.free_bet_id);
    setShowOfferIdentityValidation(false);
    setSettledEditEnabled(false);
    if (options?.returnToLedgerOnSuccess ?? !options?.autosaveLabel) {
      setWorkflowVisible(false);
      setTableCollapsed(false);
    }
    setStatusMessage(
      options?.autosaveLabel
        ? `${options.autosaveLabel} autosaved for ${saved.free_bet_id}.`
        : isEditing
          ? `Updated free bet ${saved.free_bet_id}.`
          : `Created free bet ${saved.free_bet_id}.`
    );
    return true;
  }

  async function applyDropdownChange(
    updater: (current: FreeBetFormState) => FreeBetFormState,
    autosaveLabel: string
  ) {
    const nextFormState = updater(formState);
    setFormState(nextFormState);
    if (!(selectedId ?? formState.free_bet_id)) {
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
    if (selectedRow) {
      const nextFormState = recordToForm(selectedRow);
      setPreviewCalculation(null);
      setFormState(nextFormState);
      setPristineFormState(nextFormState);
      setErrorMessage("");
      setShowOfferIdentityValidation(false);
      setSettledEditEnabled(false);
      setStatusMessage(`Reverted unsaved changes for free bet ${selectedRow.free_bet_id}.`);
      return;
    }

    const blankForm = createBlankForm();
    setPreviewCalculation(null);
    setFormState(blankForm);
    setPristineFormState(blankForm);
    setErrorMessage("");
    setShowOfferIdentityValidation(false);
    setSettledEditEnabled(false);
    setStatusMessage("Cleared the unsaved free-bet draft.");
  }

  async function handleDeleteSelectedRow() {
    if (!selectedId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete free-bet row ${selectedId}? This will remove it from this profile tracker.`
    );
    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/free-bets/${selectedId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const detail = await response.text();
      setErrorMessage(detail || "Unable to delete free-bet row");
      return;
    }

    await loadRows(null);
    setWorkflowVisible(false);
    setPreviewCalculation(null);
    setStatusMessage(`Deleted free bet ${selectedId}.`);
  }

  async function applySuggestedLayValue(mode: "Standard" | "Underlay" | "Overlay") {
    const suggested =
      mode === "Underlay"
        ? activePreviewCalculation?.underlay_reference_lay_stake ??
          selectedRow?.underlay_reference_lay_stake
        : mode === "Overlay"
          ? activePreviewCalculation?.overlay_reference_lay_stake ??
            selectedRow?.overlay_reference_lay_stake
          : activePreviewCalculation?.base_reference_lay_stake ??
            selectedRow?.base_reference_lay_stake;

    if (!suggested || suggested === "—") {
      return;
    }

    setFormState((current) => ({
      ...current,
      match_strategy: mode,
      lay_actual: suggested,
    }));

    const copied = await copyToClipboard(suggested);
    setStatusMessage(
      copied
        ? `Applied ${mode.toLowerCase()} best-value lay ${suggested}, switched strategy to ${mode}, and copied it to the clipboard.`
        : `Applied ${mode.toLowerCase()} best-value lay ${suggested} and switched strategy to ${mode}.`
    );
  }

  async function submitOutcomeModal() {
    if (!outcomeModalState) {
      return;
    }

    const sourceRow = rows.find((row) => row.free_bet_id === outcomeModalState.rowId);
    if (!sourceRow) {
      setStatusMessage("Free-bet row could not be found for outcome update.");
      return;
    }

    const nextFormState: FreeBetFormState = {
      ...recordToForm(sourceRow),
      status: outcomeModalState.status,
      result: outcomeModalState.result,
      date_settled: outcomeModalState.date_settled,
    };

    const saved = await persistForm(nextFormState, {
      autosaveLabel: "Outcome update",
      suppressMissingRequiredMessage: true,
      returnToLedgerOnSuccess: true,
    });
    if (saved) {
      setOutcomeModalState(null);
    }
  }

  function renderTableCell(row: TrackerRow, column: TableColumn) {
    const rowId = String(row.free_bet_id ?? "");
    const sourceRow = freeBetRowsById.get(rowId);
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
      column.key === "offer_details" ||
      column.key === "match_strategy" ||
      column.key === "lay_status" ||
      column.key === "back_bet_status" ||
      column.key === "status"
    ) {
      if (column.key === "offer_details" && sourceRow) {
        const detailTokens = getFreeBetOfferDetailsTokens(sourceRow);
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

      if (column.key === "match_strategy") {
        return (
          <span className={`table-chip${getFreeBetStrategyToneClass(value)}`}>
            {getCompactLedgerLabel(value)}
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
        } else if (normalizedLayStatus.includes("part")) {
          layStatusToneClass = " table-chip-lay-partial";
          layStatusLabel = "Part Laid";
        } else if (normalizedLayStatus.includes("fully")) {
          layStatusToneClass = " table-chip-back-placed";
          layStatusLabel = "Fully Laid";
        }

        return <span className={`table-chip${layStatusToneClass}`}>{layStatusLabel}</span>;
      }

      if (column.key === "back_bet_status" && sourceRow) {
        const backBetStatus = getFreeBetBackBetStatusBadge(sourceRow);
        const toneClass =
          backBetStatus.tone === "positive"
            ? " table-chip-back-placed"
            : backBetStatus.tone === "warning"
              ? " table-chip-lay-partial"
              : " table-chip-muted";
        return <span className={`table-chip${toneClass}`}>{backBetStatus.label}</span>;
      }

      if (column.key === "status" && sourceRow) {
        const normalizedStatus = value.toLowerCase();
        const statusToneClass =
          normalizedStatus.includes("prospecting") || normalizedStatus.includes("not yet awarded")
            ? " table-chip-muted"
            : normalizedStatus.includes("settled")
              ? " table-chip-status-settled"
              : normalizedStatus.includes("placed")
                ? " table-chip-status-placed"
                : normalizedStatus.includes("available")
                  ? " table-chip-lay-partial"
                  : "";
        return <span className={`table-chip${statusToneClass}`}>{value}</span>;
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
            aria-label={`Edit ${sourceRow.free_bet_id}`}
            className="icon-button table-action-button"
            onClick={() => selectRow(sourceRow.free_bet_id)}
            type="button"
          >
            <span aria-hidden="true">✎</span>
          </button>
          <button
            aria-label={`Review settlement for ${sourceRow.free_bet_id}`}
            className="icon-button table-action-button"
            onClick={() =>
              setOutcomeModalState({
                rowId: sourceRow.free_bet_id,
                status: sourceRow.status,
                result: sourceRow.result,
                date_settled: toDateTimeLocalValue(sourceRow.date_settled),
              })
            }
            type="button"
          >
            <span aria-hidden="true">🏁</span>
          </button>
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

    return <span className="table-cell-text">{value}</span>;
  }

  return (
    <section className="stack">
        <StatusToast message={statusMessage} onDismiss={clearStatusMessage} />
      <section
        aria-busy={isInitialLoading}
        className="content-panel stack sportsbook-page-shell"
      >
        <div className="sportsbook-page-header">
          <h1 className="sportsbook-page-title">Free Bets</h1>
          <div className="tracker-nav">
            <button className="button-link" onClick={startNewRow} type="button">
              Add free-bet row
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
          <LedgerLoadingIndicator label="Loading free-bet ledger" />
        ) : null}
        <div className="sportsbook-review-bar" aria-label="Free-bet review filters">
          <label className="field-control table-search-field">
            <span>Search</span>
            <input
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search free-bet rows"
              type="search"
              value={query}
            />
          </label>
          <div className="table-filter-button-wrap">
            <button
              aria-label="Open free-bet filter and column controls"
              className={`icon-button table-filter-button${hasActiveTableControls ? " has-active-table-controls" : ""}`}
              onClick={() => setIsFilterModalOpen(true)}
              title="Filter and columns"
              type="button"
            >
              <svg
                aria-hidden="true"
                className="table-filter-icon"
                fill="none"
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
                <span
                  aria-label={`${activeTableControlCount} active table controls`}
                  className="table-filter-badge"
                >
                  {activeTableControlCount > 9 ? "9+" : activeTableControlCount}
                </span>
              ) : null}
            </button>
            {hasActiveTableControls ? (
              <button
                aria-label="Clear active free-bet filters and hidden-column states"
                className="table-filter-clear"
                onClick={() => {
                  clearTableFilters();
                  setVisibleColumnKeys(new Set(defaultVisibleFreeBetColumns));
                }}
                type="button"
              >
                ×
              </button>
            ) : null}
          </div>
        </div>
        <section className="stat-strip" aria-label="Free-bet quick view">
          <article className="stat-card">
            <span className="eyebrow">Open / overdue</span>
            <strong>{quickView.openCount} / {quickView.overdueCount}</strong>
            <span>Open rows • Overdue rows</span>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Placed / available</span>
            <strong>
              {quickView.placedCount} / {quickView.availableCount}
            </strong>
            <span>Placed rows • Placeholder rows</span>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Underlays / no lay</span>
            <strong>
              {quickView.underlayCount} / {quickView.noLayCount}
            </strong>
            <span>Underlay rows • No-lay rows</span>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Expiry watch</span>
            <strong>
              {quickView.missingExpiryCount} / {quickView.upcomingExpiryCount}
            </strong>
            <span>Missing Expiry / Upcoming Expiry</span>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Resolved value</span>
            <strong>{formatMoney(quickView.totalReportingValue)}</strong>
            <span>Current ledger total</span>
          </article>
        </section>
        {!tableCollapsed ? (
          <>
            {errorMessage ? <p className="error-text" role="alert">{errorMessage}</p> : null}
            <div className="table-scroll">
              <table className="data-table sportsbook-data-table">
                <colgroup>
                  {tableColumns.map((column) => {
                    const key = column.key as FreeBetColumnKey;
                    const width = columnWidths[key] ?? defaultFreeBetColumnWidths[key];
                    return <col key={column.key} style={{ width: `${width}px` }} />;
                  })}
                </colgroup>
                <thead>
                  <tr>
                    {tableColumns.map((column) => {
                      const sortable = isSortableFreeBetColumn(column.key);
                      const sortableKey = sortable ? (column.key as FreeBetSortKey) : null;
                      const isActiveSort = sortable && tableSort?.key === column.key;
                      const sortDirection = isActiveSort ? tableSort?.direction : null;
                      const sortMarker =
                        sortDirection === "asc" ? "▲" : sortDirection === "desc" ? "▼" : "↕";
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
                                  column.key as FreeBetColumnKey,
                                  headerCell,
                                  tableElement
                                );
                              }}
                              onMouseDown={(event) => {
                                const headerCell = event.currentTarget.closest("th");
                                startColumnResize(
                                  event,
                                  column.key as FreeBetColumnKey,
                                  headerCell
                                );
                              }}
                            />
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length === 0 ? (
                    <tr>
                      <td className="empty-cell" colSpan={tableColumns.length}>
                        No free-bet rows match the current filter.
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((row, index) => {
                      const rowId = String(row.free_bet_id);
                      const sourceRow = freeBetRowsById.get(rowId);
                      const issueTone = sourceRow ? getFreeBetIssueTone(sourceRow) : null;
                      const rowIssueBadges = sourceRow
                        ? sortIssueBadgesByPriority(getFreeBetIssueBadges(sourceRow))
                        : [];
                      return (
                        <tr
                          className={[
                            selectedId === rowId ? "is-selected-row" : "",
                            issueTone === "danger"
                              ? "row-state-issue-danger"
                              : issueTone === "warning"
                                ? "row-state-issue-warning"
                                : issueTone === "orange"
                                  ? "row-state-issue-caution"
                                  : issueTone === "info"
                                    ? "row-state-issue-info"
                                  : "",
                          ]
                            .filter(Boolean)
                            .join(" ") || undefined}
                          key={`${rowId}-${index}`}
                          onClick={() => selectRow(rowId)}
                          onDoubleClick={() => selectRow(rowId, { collapseTable: true })}
                        >
                          {tableColumns.map((column) => (
                            <td className="align-center" key={column.key}>
                              {column.key === "date_settled" && rowIssueBadges.length > 0 ? (
                                <div className="row-issue-overlay" aria-hidden="true">
                                  {rowIssueBadges.map((badge) => (
                                    <span
                                      className={`table-chip${
                                        badge.tone === "danger"
                                          ? " table-chip-warning"
                                          : badge.tone === "orange"
                                            ? " table-chip-expiry-watch"
                                            : badge.tone === "info"
                                              ? " table-chip-info"
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
            <div className="table-pagination" aria-label="Free-bet pagination">
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
            aria-label="Free-bet filter controls"
            aria-modal="true"
            className="modal-panel stack"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="workflow-panel-header">
              <div className="stack">
                <span className="eyebrow">Table controls</span>
                <strong>Filter free-bet rows</strong>
              </div>
              <button
                aria-label="Close free-bet filter controls"
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
                  aria-label="Free-bet review mode"
                  onChange={(event) => {
                    setTableMode(event.target.value as FreeBetTableMode);
                    setCurrentPage(1);
                  }}
                  value={tableMode}
                >
                  {freeBetTableModes.map((mode) => (
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
                  {freeBetFilterOptions.bookmakers.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Offer type (promotion mechanism)</span>
                <select
                  onChange={(event) => updateTableFilter("offer_type", event.target.value)}
                  value={tableFilters.offer_type}
                >
                  <option value="">All</option>
                  {freeBetFilterOptions.offerTypes.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Fixture type</span>
                <select
                  onChange={(event) => updateTableFilter("fixture_type", event.target.value)}
                  value={tableFilters.fixture_type}
                >
                  <option value="">All</option>
                  {freeBetFilterOptions.fixtureTypes.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Bet type</span>
                <select
                  onChange={(event) => updateTableFilter("bet_type", event.target.value)}
                  value={tableFilters.bet_type}
                >
                  <option value="">All</option>
                  {freeBetFilterOptions.betTypes.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Mode</span>
                <select
                  onChange={(event) => updateTableFilter("retention_mode", event.target.value)}
                  value={tableFilters.retention_mode}
                >
                  <option value="">All</option>
                  {freeBetFilterOptions.retentionModes.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Strategy</span>
                <select
                  onChange={(event) => updateTableFilter("match_strategy", event.target.value)}
                  value={tableFilters.match_strategy}
                >
                  <option value="">All</option>
                  {freeBetFilterOptions.strategies.map((option) => (
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
                  {freeBetFilterOptions.layStatuses.map((option) => (
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
                  {freeBetFilterOptions.backBetStatuses.map((option) => (
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
                  {freeBetFilterOptions.statuses.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className={`field-control${tableFilters.issue_type !== "any" ? " is-active-filter" : ""}`}>
                <span>Issue type</span>
                <select
                  onChange={(event) =>
                    updateTableFilter("issue_type", event.target.value as FreeBetIssueFilter)
                  }
                  value={tableFilters.issue_type}
                >
                  <option value="any">All rows</option>
                  <option value="all-issues">All issues</option>
                  <option value="back-unplaced">Back Unplaced</option>
                  <option value="no-settle-date">No Settle Date</option>
                  <option value="outcome-needed">Outcome Needed</option>
                  <option value="expiry-watch">Expiry Watch</option>
                  <option value="no-expiry">No Expiry</option>
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
                {freeBetTableColumns.map((column) => {
                  const key = column.key as FreeBetColumnKey;
                  const hideable = hideableFreeBetColumnKeys.has(key);
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
              <button
                className="button-link"
                onClick={() => {
                  clearTableFilters();
                  setVisibleColumnKeys(new Set(defaultVisibleFreeBetColumns));
                }}
                type="button"
              >
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
            aria-label="Update free-bet outcome"
            aria-modal="true"
            className="modal-panel stack"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="workflow-panel-header">
              <div className="stack">
                <span className="eyebrow">Outcome action</span>
                <strong>Update free-bet settlement and outcome</strong>
              </div>
              <button
                aria-label="Close free-bet outcome modal"
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
                  {freeBetStatusOptions.map((option) => (
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
                  {(rows.find((row) => row.free_bet_id === outcomeModalState.rowId)
                    ? getFreeBetResultOptions(
                        rows.find((row) => row.free_bet_id === outcomeModalState.rowId)?.match_strategy ?? ""
                      )
                    : freeBetResultOptions
                  ).map((option) => (
                    <option key={option} value={option}>
                      {getFreeBetResultLabel(
                        option,
                        rows.find((row) => row.free_bet_id === outcomeModalState.rowId)?.match_strategy ===
                          "No Lay"
                      )}
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

      {workflowVisible ? (
        <div className="modal-backdrop" onClick={closeEditor}>
      <section
        aria-label={selectedId ? "Edit free-bet row" : "Create free-bet row"}
        aria-modal="true"
        className="content-panel stack workflow-editor-panel modal-panel workflow-editor-modal"
        data-pd-id="free-bets.editor.dialog"
        onClick={(event) => event.stopPropagation()}
        ref={editorRef}
        role="dialog"
      >
        <div className="workflow-panel-header workflow-editor-header" data-pd-id="free-bets.editor.header">
          <div className="stack">
            <span className="eyebrow">{selectedId ? "Edit free-bet row" : "Create free-bet row"}</span>
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
            <button aria-label="Close free-bet editor" className="button-link" data-initial-focus="" onClick={closeEditor} type="button">
              Close
            </button>
          </div>
        </div>
        <div className="workflow-editor-body">
        {selectedRow || activePreviewCalculation ? (
          <section className="stat-strip" aria-label="Free-bet editor overview">
            <article className="stat-card">
              <span className="eyebrow">
                {getDisplayedValueLabel(activePreviewCalculation, selectedRow)}
              </span>
              <strong>{getDisplayedValue(activePreviewCalculation, selectedRow)}</strong>
              <span>Status: {formState.status || "—"}</span>
            </article>
            <article className="stat-card">
              <span className="eyebrow">Expiry</span>
              <strong>
                {formState.expiry_datetime
                  ? formatDisplayDate(fromDateTimeLocalValue(formState.expiry_datetime))
                  : "—"}
              </strong>
              <span>{getPlaceholderGuidance(formState.status)}</span>
            </article>
            <article className="stat-card">
              <span className="eyebrow">Lay and matching</span>
              <strong>{formState.match_strategy || "—"}</strong>
              <span>Lay status: {activePreviewCalculation?.lay_status ?? selectedRow?.lay_status ?? "—"}</span>
            </article>
            <article className="stat-card">
              <span className="eyebrow">Offer path</span>
              <strong>{formState.offer_type || "Offer type pending"}</strong>
              <span>
                {offerTypeDescriptor
                  ? `${offerTypeDescriptor.calculatorFamily} • ${offerTypeDescriptor.summary}`
                  : [formState.bookmaker, formState.retention_mode].filter(Boolean).join(" • ") ||
                    "Bookmaker and mode pending"}
              </span>
            </article>
          </section>
        ) : null}
        {!isPlaceholderStatus || hasOutcomePreview ? (
          <section
            className="stat-strip"
            aria-label={formState.result === "Pending" ? "Free-bet possible outcomes" : "Free-bet outcome review"}
          >
            <article className="stat-card">
              <span className="eyebrow">{getOutcomeCardLabel(getOutcomeCardState(formState.result, "back"))}</span>
              <strong>{getFreeBetBackLabel(formState.result)}</strong>
              <span>{activePreviewCalculation?.scenario_pnl_if_back_wins ?? selectedRow?.scenario_pnl_if_back_wins ?? "—"}</span>
            </article>
            <article className="stat-card">
              <span className="eyebrow">{getOutcomeCardLabel(getOutcomeCardState(formState.result, "lay"))}</span>
              <strong>{getFreeBetLayLabel(formState.result, isNoLayStrategy)}</strong>
              <span>{activePreviewCalculation?.scenario_pnl_if_lay_wins ?? selectedRow?.scenario_pnl_if_lay_wins ?? "—"}</span>
            </article>
          </section>
        ) : null}
        <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
          <EditorSection
            headerAside={
              isSettledReadOnly ? <span className="section-lock-chip">Settled row locked</span> : null
            }
            invalid={offerIdentityValidationActive && missingOfferIdentityFields.length > 0}
            title="Offer setup"
          >
            {offerIdentityValidationActive && missingOfferIdentityFields.length > 0 ? (
              <p className="field-validation-text" role="alert">
                Complete the required Offer setup fields: {missingOfferIdentityFields.join(", ")}.
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
                  offerIdentityValidationActive && !formState.bookmaker.trim() ? " is-invalid" : ""
                }`}
              >
                <span>Bookmaker</span>
                <select
                  aria-invalid={offerIdentityValidationActive && !formState.bookmaker.trim()}
                  onChange={(event) =>
                    void applyDropdownChange(
                      (current) => ({ ...current, bookmaker: event.target.value }),
                      "Bookmaker change"
                    )
                  }
                  required
                  value={formState.bookmaker}
                >
                  <option value="">Select bookmaker</option>
                  {bookmakerOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className={`field-control${
                offerIdentityValidationActive && !formState.offer_type.trim() ? " is-invalid" : ""
              }`}>
                <span>Offer type (promotion mechanism)</span>
                <select
                  aria-invalid={offerIdentityValidationActive && !formState.offer_type.trim()}
                  onChange={(event) =>
                    void applyDropdownChange(
                      (current) => applyOfferTypeDefaults(current, event.target.value),
                      "Offer type change"
                    )
                  }
                  value={formState.offer_type}
                >
                  <option value="">Select offer type</option>
                  {offerTypeOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Campaign tag (optional)</span>
                <select
                  onChange={(event) =>
                    void applyDropdownChange(
                      (current) => ({
                        ...current,
                        offer_name: event.target.value,
                        offer_text: current.offer_text || event.target.value,
                      }),
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
              <label className="field-control">
                <span>Bet type (bet shape / placement)</span>
                <select
                  onChange={(event) =>
                    void applyDropdownChange(
                      (current) => applyBetTypeDefaults(current, event.target.value),
                      "Bet type change"
                    )
                  }
                  value={formState.bet_type}
                >
                  <option value="">Select bet type</option>
                  {betTypeOptionsResolved.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <p className="field-help-text">
                  Use bet type for wager shape or placement context, for example Single, In Play + Single, or Bet Builder.
                </p>
              </label>
              <label className="field-control">
                <span>Fixture type</span>
                <select
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
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label
                className={`field-control${
                  offerIdentityValidationActive && !formState.event_name.trim() ? " is-invalid" : ""
                }`}
              >
                <span>Event name</span>
                <input
                  aria-invalid={offerIdentityValidationActive && !formState.event_name.trim()}
                  onChange={(event) => setFormState((current) => ({ ...current, event_name: event.target.value }))}
                  required
                  value={formState.event_name}
                />
              </label>
            </div>
            </fieldset>
          </EditorSection>

          <EditorSection
            headerAside={
              isSettledReadOnly ? <span className="section-lock-chip">Settled row locked</span> : null
            }
            invalid={
              offerIdentityValidationActive && missingPlacementFields.includes("Settles")
            }
            title="Award and settlement"
          >
            {offerIdentityValidationActive && missingPlacementFields.includes("Settles") ? (
              <p className="field-validation-text" role="alert">
                Settled or resolved free-bet rows need a settle date.
              </p>
            ) : null}
            <fieldset className="section-fieldset" disabled={isSettledReadOnly}>
            <div className="form-grid">
              {formState.status === "Not Yet Awarded" ? (
                <label className="field-control field-span-2">
                  <span>Award rule</span>
                  <input
                    readOnly
                    value="Not Yet Awarded rows carry no conversion plan yet. Move to Available once the free bet is actually issued."
                  />
                </label>
              ) : null}
              <label className="field-control">
                <span>Retention mode</span>
                <select
                  onChange={(event) =>
                    void applyDropdownChange(
                      (current) => ({ ...current, retention_mode: event.target.value }),
                      "Retention mode change"
                    )
                  }
                  value={formState.retention_mode}
                >
                  {freeBetRetentionModeOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
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
                  {freeBetStatusOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Expiry</span>
                <input
                  type="datetime-local"
                  onChange={(event) => setFormState((current) => ({ ...current, expiry_datetime: event.target.value }))}
                  value={formState.expiry_datetime}
                />
              </label>
              <label className="field-control">
                <span>Settles</span>
                <input
                  aria-invalid={offerIdentityValidationActive && missingPlacementFields.includes("Settles")}
                  type="datetime-local"
                  onChange={(event) => setFormState((current) => ({ ...current, date_settled: event.target.value }))}
                  value={formState.date_settled}
                />
              </label>
            </div>
            </fieldset>
          </EditorSection>
          <EditorSection
            headerAside={
              isSettledReadOnly ? (
                <span className="section-lock-chip">Settled row locked</span>
              ) : !calculatorUnlocked ? (
                <span className="section-lock-chip">{calculatorLockReason}</span>
              ) : null
            }
            invalid={offerIdentityValidationActive && missingPlacementFields.length > 0}
            title="Calculator panel"
          >
            {offerIdentityValidationActive && missingPlacementFields.length > 0 ? (
              <p className="field-validation-text" role="alert">
                Complete the required placed/settled free-bet fields: {missingPlacementFields.join(", ")}.
              </p>
            ) : null}
            <fieldset className="section-fieldset" disabled={isSettledReadOnly || !calculatorUnlocked}>
            <div className="calculator-panel-shell">
              <div className="calculator-panel-heading">
                <strong>{`${formState.offer_type || "Offer type pending"} + ${formState.retention_mode || "Mode pending"} + ${formState.match_strategy || "Strategy pending"}`}</strong>
              </div>
              <div className="calculator-shell">
                <div className="calculator-band calculator-band-primary">
                  <span className="eyebrow">Matching plan</span>
                  {calculatorUnlocked && !previewReady && missingCalculatorFields.length > 0 ? (
                    <p className="field-validation-text" role="alert">
                      Complete calculator inputs: {missingCalculatorFields.join(", ")}.
                    </p>
                  ) : null}
                  <div className="form-grid calculator-input-grid">
                    {calculatorRuleItems.length > 0 ? (
                      <div className="calculator-rule-row field-span-2" role="list" aria-label="Free-bet workflow rules">
                        {calculatorRuleItems.map((item) => (
                          <span className="calculator-rule-chip" key={item} role="listitem">
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <label
                      className={`field-control${
                        calculatorUnlocked && missingCalculatorFields.includes("Free-bet value")
                          ? " is-invalid"
                          : ""
                      }`}
                    >
                      <span>Free-bet value</span>
                      <input
                        aria-invalid={calculatorUnlocked && missingCalculatorFields.includes("Free-bet value")}
                        onChange={(event) =>
                          setFormState((current) => ({ ...current, free_bet_value: event.target.value }))
                        }
                        value={formState.free_bet_value}
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
                    <label className="field-control">
                      <span>Strategy</span>
                      <select
                        onChange={(event) =>
                          void applyDropdownChange(
                            (current) => applyStrategyDefaults(current, event.target.value),
                            "Strategy change"
                          )
                        }
                        value={formState.match_strategy}
                      >
                        {freeBetStrategyOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
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
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>
                </div>
                {!isNoLayStrategy ? (
                  <div className="calculator-band calculator-band-primary">
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
                      onChange={(event) => setFormState((current) => ({ ...current, lay_odds_1: event.target.value }))}
                      value={formState.lay_odds_1}
                    />
                  </label>
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
                      onChange={(event) => setFormState((current) => ({ ...current, lay_actual: event.target.value }))}
                      value={formState.lay_actual}
                    />
                  </label>
                  {showsLayMatchedStake ? (
                    <label className="field-control">
                      <span>Lay matched stake 1</span>
                      <input
                        onChange={(event) =>
                          setFormState((current) => ({ ...current, lay_matched_stake_1: event.target.value }))
                        }
                        value={formState.lay_matched_stake_1}
                      />
                    </label>
                  ) : null}
                  </div>
                ) : null}
                <div
                  className={`calculator-band calculator-band-secondary${
                    isNoLayStrategy ? " calculator-band-single" : ""
                  }`}
                >
                  {!isNoLayStrategy ? (
                  <div className="calculator-panel-card">
                    <span className="eyebrow">Suggested lay</span>
                    {previewReady ? (
                      <div className="stack">
                        {isCalculatedState ? (
                          <div className="tracker-nav">
                            <span className={getCalculationStateChipClassName(activeCalculationState)}>
                              {getCalculationStateLabel(activeCalculationState)}
                            </span>
                          </div>
                        ) : null}
                        <strong>
                          Best-value lay suggestion ({formState.match_strategy}): {activeSuggestedLay}
                        </strong>
                        <p className="field-help-text">
                          Current best-value suggestion from contract-backed lay references.
                        </p>
                        <div className="summary-list">
                          <p className="lede"><span className="summary-label">Standard</span><button className="button-link button-link-lay" disabled={(activePreviewCalculation?.base_reference_lay_stake ?? selectedRow?.base_reference_lay_stake ?? "—") === "—"} onClick={() => void applySuggestedLayValue("Standard")} type="button">{activePreviewCalculation?.base_reference_lay_stake ?? selectedRow?.base_reference_lay_stake ?? "—"}</button></p>
                          <p className="lede"><span className="summary-label">Underlay</span><button className="button-link button-link-lay" disabled={(activePreviewCalculation?.underlay_reference_lay_stake ?? selectedRow?.underlay_reference_lay_stake ?? "—") === "—"} onClick={() => void applySuggestedLayValue("Underlay")} type="button">{activePreviewCalculation?.underlay_reference_lay_stake ?? selectedRow?.underlay_reference_lay_stake ?? "—"}</button></p>
                          <p className="lede"><span className="summary-label">Overlay</span><button className="button-link button-link-lay" disabled={(activePreviewCalculation?.overlay_reference_lay_stake ?? selectedRow?.overlay_reference_lay_stake ?? "—") === "—"} onClick={() => void applySuggestedLayValue("Overlay")} type="button">{activePreviewCalculation?.overlay_reference_lay_stake ?? selectedRow?.overlay_reference_lay_stake ?? "—"}</button></p>
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
                      <p className="lede">
                        {calculatorUnlocked
                          ? `Complete calculator inputs: ${missingCalculatorFields.join(", ")}.`
                          : isAwaitingAwardStatus
                            ? "Free bet not yet issued. Move to Available before planning conversion."
                            : "Complete offer setup first."}
                      </p>
                    )}
                  </div>
                  ) : null}
                  <div className="calculator-panel-card">
                    <span className="eyebrow">Projected PnL</span>
                    {previewReady ? (
                      <div className="stack">
                        <strong>
                          {getDisplayedValueLabel(activePreviewCalculation, selectedRow)}: {getDisplayedValue(activePreviewCalculation, selectedRow)}
                        </strong>
                        <p className="lede">
                          {getFreeBetBackLabel(formState.result)}: {activePreviewCalculation?.scenario_pnl_if_back_wins ?? selectedRow?.scenario_pnl_if_back_wins ?? "—"}
                        </p>
                        <p className="lede">
                          {getFreeBetLayLabel(formState.result, isNoLayStrategy)}: {activePreviewCalculation?.scenario_pnl_if_lay_wins ?? selectedRow?.scenario_pnl_if_lay_wins ?? "—"}
                        </p>
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
                      <p className="lede">
                        {calculatorUnlocked
                          ? `Complete calculator inputs: ${missingCalculatorFields.join(", ")}.`
                          : isAwaitingAwardStatus
                            ? "Free bet not yet issued. Move to Available before planning conversion."
                            : "Complete offer setup first."}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            </fieldset>
          </EditorSection>
          <EditorSection
            headerAside={
              isSettledReadOnly ? <span className="section-lock-chip">Settled row locked</span> : null
            }
            title="Result"
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
                    <option key={option} value={option}>
                      {getFreeBetResultLabel(option, isNoLayStrategy)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            </fieldset>
          </EditorSection>
          <EditorSection defaultOpen={false} title="Advanced controls">
            {(activePreviewCalculation?.calculation_notes.length || selectedRow?.calculation_notes.length) ? (
              <section className="stack">
                <span className="eyebrow">Calculation notes</span>
                {(activePreviewCalculation?.calculation_notes.length
                  ? activePreviewCalculation.calculation_notes
                  : selectedRow?.calculation_notes ?? []).map((note) => (
                  <p className="lede" key={note}>{note}</p>
                ))}
              </section>
            ) : null}
            {selectedRow || activePreviewCalculation ? (
              <section className="stack">
                <span className="eyebrow">Contract trace</span>
                <div className="meta-grid">
                  <dl>
                    <dt>Calculation state</dt>
                    <dd>{activePreviewCalculation?.calculation_state ?? selectedRow?.calculation_state ?? "—"}</dd>
                  </dl>
                  <dl>
                    <dt>Displayed value source</dt>
                    <dd>{getCalculationValueSource(activePreviewCalculation, selectedRow)}</dd>
                  </dl>
                  <dl>
                    <dt>Reporting figure shown</dt>
                    <dd>{getDisplayedValue(activePreviewCalculation, selectedRow)}</dd>
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
                <span>Origin qualifying bet ID</span>
                <input
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, origin_qual_bet_id: event.target.value }))
                  }
                  value={formState.origin_qual_bet_id}
                />
              </label>
              <label className="field-control field-span-2">
                <span>Offer group ID</span>
                <input
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, offer_group_id: event.target.value }))
                  }
                  value={formState.offer_group_id}
                />
              </label>
              <label className="field-control field-span-2">
                <span>Manual override value</span>
                <input
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, manual_override_value: event.target.value }))
                  }
                  value={formState.manual_override_value}
                />
              </label>
              <label className="field-control field-span-2">
                <span>Manual override reason</span>
                <input
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, manual_override_reason: event.target.value }))
                  }
                  value={formState.manual_override_reason}
                />
              </label>
              <label className="field-control field-span-2">
                <span>Notes</span>
                <textarea
                  onChange={(event) => setFormState((current) => ({ ...current, user_notes: event.target.value }))}
                  rows={5}
                  value={formState.user_notes}
                />
              </label>
            </div>
            </fieldset>
          </EditorSection>
          <div className="tracker-nav field-span-2 workflow-editor-footer" data-pd-id="free-bets.editor.actions">
            <button className="review-chip review-chip-copy" disabled={isPending || isSettledReadOnly} type="submit">
              Save
            </button>
            {selectedId ? (
              <button className="review-chip review-chip-danger" onClick={() => void handleDeleteSelectedRow()} type="button">
                Delete
              </button>
            ) : null}
            <button className="review-chip" onClick={handleResetForm} type="button">
              Revert
            </button>
            <button aria-label="Close free-bet editor" className="button-link tracker-nav-right-action" onClick={closeEditor} type="button">
              Close
            </button>
          </div>
        </form>
        </div>
      </section>
      </div>
      ) : null}
    </section>
  );
}
