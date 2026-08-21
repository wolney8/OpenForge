"use client";

import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { apiBaseUrl } from "@/lib/api";
import {
  fetchJsonAndCache,
  invalidateCachedJson,
  readCachedJson,
  TRACKER_STALE_WHILE_REFRESH_MS,
} from "@/lib/client-json-cache";
import { dispatchTrackerDataUpdated } from "@/lib/tracker-data-events";
import { getAccountNamesByType, type AccountAuthorityRecord } from "@/lib/account-authorities";
import { StatusToast } from "@/components/status-toast";
import { BookmakerIdentity, useBookmakerCatalogue } from "@/components/bookmaker-identity";
import { EditorSection } from "@/components/editor-section";
import { EditorValidationBanner } from "@/components/editor-validation-banner";
import { FinancialValue } from "@/components/financial-value";
import { formatFinancialValue } from "@/lib/financial-display";
import { LedgerEditorTabPanel, LedgerEditorTabRail } from "@/components/ledger-editor-tabs";
import { LedgerValueCell } from "@/components/ledger-value-cell";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { LedgerAddRowButton } from "@/components/ledger-add-row-button";
import { LedgerSettledDeleteGuard } from "@/components/ledger-settled-delete-guard";
import { TrackerRangeCard } from "@/components/tracker-range-card";
import { FeeReviewResolutionBanner } from "@/components/fee-review-resolution-banner";
import { refreshFeeReviewResolutionSession, type FeeReviewResolutionContext } from "@/lib/fee-review-session";
import { getSettlementValidationMessage } from "@/lib/settlement-validation";
import { getFollowUpReminderDefaultDueAt } from "@/lib/follow-up-reminder";
import { FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT } from "@/lib/notifications";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "@/lib/date-format";
import {
  scrollToElementTopAfterRender,
  isGuidedAccessEnabled,
  useBodyScrollLock,
  useDialogFocusLifecycle,
  usePersistedBoolean,
  usePersistedState,
  useProfileGuidedAccessMode,
  useToastDismiss,
  useTrackerRouteReselect,
} from "@/lib/ledger-ui";
import { getLookupValuesByType, type LookupValueRecord } from "@/lib/lookup-values";
import {
  calculateFreeBetResultCardPreview,
  getCalculatorModeForLayWorkflowMode,
  getLayWorkflowModeForStrategy,
  getSingleLayResultModes,
  getMatchRatingInterpretation,
  getMatchRatingPillTone,
  getStrategyForLayWorkflowMode,
  isDecimalCalculatorInput,
  type LayWorkflowMode,
  type SingleLayResultMode,
} from "@/lib/ledger-calculator";
import type { TableColumn } from "@/lib/tracker-modules";
import { getSettlementTabAttentionState, type LedgerEditorTabDefinition } from "@/lib/ledger-editor-tabs";
import { saveTrackerDatePreset } from "@/lib/tracker-settings-client";
import {
  formatDisplayDate,
  formatHumanDisplayDate,
  formatResolvedDateRange,
  formatResolvedDateRangeContext,
  resolveDateRange,
  type DatePreset,
} from "@/lib/tracker-summary";
import { filterTrackerRows, getTrackerPageCount, paginateTrackerRows } from "@/lib/tracker-table";
import type { TrackerRow } from "@/lib/tracker-types";
import { confirmDestructiveAction, useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { sortIssueBadgesByPriority } from "@/lib/issue-priority";
import {
  dedupeOptions,
  fixtureTypeOptions,
  freeBetResultOptions,
  freeBetRetentionModeOptions,
  freeBetStatusOptions,
  getAllowedBetTypesForOfferType,
  getDefaultBetTypeForOfferType,
  getOfferTypeOptions,
  normalizeSportsbookBetType,
} from "@/lib/workbook-options";

const commonFixtureQuickPicks = ["Football", "Horse Racing", "Golf", "Tennis"];

type FreeBetEditorTabId = "setup" | "matching" | "settlement";
type FreeBetGuidedFieldKey =
  | "offer"
  | "bookmaker"
  | "offer_type"
  | "free_bet_value"
  | "bet_type"
  | "fixture_type"
  | "event_name"
  | "back_odds"
  | "exchange"
  | "lay_odds_1"
  | "lay_actual"
  | "settles"
  | "result";

type FreeBetGuidedEntry = {
  message: string;
  nextRequiredField: FreeBetGuidedFieldKey | null;
  state: "ready" | "review_required" | "complete";
};

const freeBetGuidedFieldTabMap: Record<FreeBetGuidedFieldKey, FreeBetEditorTabId> = {
  back_odds: "matching",
  bet_type: "setup",
  bookmaker: "setup",
  event_name: "setup",
  exchange: "matching",
  fixture_type: "setup",
  free_bet_value: "matching",
  lay_actual: "matching",
  lay_odds_1: "matching",
  offer: "setup",
  offer_type: "setup",
  result: "settlement",
  settles: "settlement",
};

const freeBetGuidedTabLabels: Record<FreeBetEditorTabId, string> = {
  matching: "Matching",
  setup: "Bet Setup",
  settlement: "Settlement",
};

const freeBetLayWorkflowModeOptions: LayWorkflowMode[] = ["No Lay", "Standard", "Advanced"];

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
  source_award_group_id: string;
  source_award_split_index: number;
  source_award_split_total: number;
  source_award_expected_value: string;
  source_award_variance_reason: string;
  user_notes: string;
  manual_override_value: string;
  manual_override_reason: string;
  created_at: string;
  updated_at: string;
  follow_up_reminder_state: string;
  follow_up_reminder_due_at: string;
  follow_up_reminder_reason: string;
  follow_up_reminder_resolution_note: string;
  follow_up_reminder_resolved_at: string;
  follow_up_reminder_resolved_by: string;
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
  source_award_group_id: string;
  source_award_split_index: number;
  source_award_split_total: number;
  source_award_expected_value: string;
  source_award_variance_reason: string;
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

type FreeBetFollowUpReminderEditorState = {
  rowId: string;
  due_at: string;
  reason: string;
  resolution_note: string;
  wasActive: boolean;
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
  default_exchange_name?: string;
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
const freeBetTerminalStatuses = new Set(["Settled", "Expired", "Void", "Converted", "Error"]);

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

function formatPreviewMoney(value: number): string {
  return value.toFixed(2);
}

function formatPreviewFinancialValue(value: number | string | null | undefined): string {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? parseCurrencyLikeValue(value)
        : null;
  return parsed === null ? "—" : formatFinancialValue(parsed);
}

function renderPreviewFinancialValue(value: number | string | null | undefined) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? parseNumericInput(value)
        : null;
  return parsed === null ? (
    <span className="projected-outcome-financial-value financial-value financial-value-neutral">
      £ -
    </span>
  ) : (
    <FinancialValue
      animate={false}
      className="projected-outcome-financial-value"
      value={parsed}
      zeroTone="neutral"
    />
  );
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

function getFreeBetGuidedEntry({
  calculatorUnlocked,
  formState,
  isNoLayStrategy,
  missingCalculatorFields,
  missingOfferIdentityFields,
  missingPlacementFields,
}: {
  calculatorUnlocked: boolean;
  formState: FreeBetFormState;
  isNoLayStrategy: boolean;
  missingCalculatorFields: string[];
  missingOfferIdentityFields: string[];
  missingPlacementFields: string[];
}): FreeBetGuidedEntry {
  if (missingOfferIdentityFields.includes("Offer")) {
    return { message: "Add The Offer Name As Shown.", nextRequiredField: "offer", state: "ready" };
  }
  if (missingOfferIdentityFields.includes("Bookmaker")) {
    return { message: "Choose The Bookmaker.", nextRequiredField: "bookmaker", state: "ready" };
  }
  if (missingOfferIdentityFields.includes("Offer type")) {
    return { message: "Choose The Offer Type.", nextRequiredField: "offer_type", state: "ready" };
  }
  if (missingOfferIdentityFields.includes("Bet type")) {
    return { message: "Choose The Bet Type.", nextRequiredField: "bet_type", state: "ready" };
  }
  if (missingOfferIdentityFields.includes("Fixture type")) {
    return { message: "Choose The Fixture Type.", nextRequiredField: "fixture_type", state: "ready" };
  }
  if (missingOfferIdentityFields.includes("Event name")) {
    return { message: "Add The Event Name.", nextRequiredField: "event_name", state: "ready" };
  }
  if (!calculatorUnlocked) {
    return {
      message: "Move The Free Bet To Available Before Matching.",
      nextRequiredField: "result",
      state: "review_required",
    };
  }
  if (missingCalculatorFields.includes("Free-bet value")) {
    return { message: "Add The Free-Bet Value.", nextRequiredField: "free_bet_value", state: "ready" };
  }
  if (missingCalculatorFields.includes("Back odds")) {
    return { message: "Enter The Back Odds.", nextRequiredField: "back_odds", state: "ready" };
  }
  if (!isNoLayStrategy && missingCalculatorFields.includes("Exchange")) {
    return { message: "Choose The Lay Exchange.", nextRequiredField: "exchange", state: "ready" };
  }
  if (!isNoLayStrategy && missingCalculatorFields.includes("Lay odds 1")) {
    return { message: "Enter The Lay Odds.", nextRequiredField: "lay_odds_1", state: "ready" };
  }
  if (!isNoLayStrategy && missingCalculatorFields.includes("Lay actual")) {
    return { message: "Confirm The Lay Actual.", nextRequiredField: "lay_actual", state: "ready" };
  }
  if (missingPlacementFields.includes("Settles")) {
    return {
      message: "Confirm The Settlement Date And Outcome.",
      nextRequiredField: "settles",
      state: "review_required",
    };
  }
  if (formState.status === "Settled" && formState.result === "Pending") {
    return { message: "Choose The Outcome.", nextRequiredField: "result", state: "review_required" };
  }
  return { message: "Free Bet Ready.", nextRequiredField: null, state: "complete" };
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

function getFreeBetResultOptions(strategy: string): string[] {
  if (strategy === "No Lay") {
    return ["Pending", "Win", "Lose", "Void"];
  }

  return ["Pending", "Back Won", "Lay Won", "Void"];
}

function normalizeFreeBetResultOption(result: string, isNoLayStrategy: boolean): string {
  if (isNoLayStrategy) {
    if (result === "Back Won") {
      return "Win";
    }
    if (result === "Lay Won") {
      return "Lose";
    }
    return result;
  }

  if (result === "Win") {
    return "Back Won";
  }
  if (result === "Lose") {
    return "Lay Won";
  }
  return result;
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
  { key: "displayed_value", label: "Value" },
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
  lay_status: 145,
  back_bet_status: 155,
  displayed_value: 130,
  status: 205,
  actions: 170,
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
    source_award_group_id: "",
    source_award_split_index: 0,
    source_award_split_total: 0,
    source_award_expected_value: "",
    source_award_variance_reason: "",
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
    source_award_group_id: record.source_award_group_id,
    source_award_split_index: record.source_award_split_index,
    source_award_split_total: record.source_award_split_total,
    source_award_expected_value: record.source_award_expected_value,
    source_award_variance_reason: record.source_award_variance_reason,
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
  initialRecordId,
  feeReviewContext,
}: {
  profileId: string;
  initialTableMode?: string;
  initialQuery?: string;
  initialIssueFilter?: string;
  initialRecordId?: string;
  feeReviewContext?: FeeReviewResolutionContext;
}) {
  const { catalogue: bookmakerCatalogue, displaySettings: bookmakerDisplaySettings } =
    useBookmakerCatalogue(profileId);
  const [guidedAccessMode] = useProfileGuidedAccessMode(profileId);
  const guidedAccessEnabled = isGuidedAccessEnabled(guidedAccessMode);
  const [rows, setRows] = useState<FreeBetRecord[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [accountAuthorities, setAccountAuthorities] = useState<AccountAuthorityRecord[]>([]);
  const [exchangeSettings, setExchangeSettings] = useState<ExchangeCommissionRecord[]>([]);
  const [trackerSettings, setTrackerSettings] = useState<TrackerSettingsRecord | null>(null);
  const [isTrackerRangeSaving, setIsTrackerRangeSaving] = useState(false);
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
  useEffect(() => {
    const supported = new Set<FreeBetIssueFilter>([
      "all-issues",
      "back-unplaced",
      "no-settle-date",
      "outcome-needed",
      "expiry-watch",
      "no-expiry",
    ]);
    if (initialIssueFilter && supported.has(initialIssueFilter as FreeBetIssueFilter)) {
      setTableFilters((current) => ({
        ...current,
        issue_type: initialIssueFilter as FreeBetIssueFilter,
      }));
    }
  }, [initialIssueFilter, setTableFilters]);
  const [tableSort, setTableSort] = useState<FreeBetTableSort | null>(null);
  const [formState, setFormState] = useState<FreeBetFormState>(createBlankForm);
  const [pristineFormState, setPristineFormState] = useState<FreeBetFormState>(createBlankForm);
  const [outcomeModalState, setOutcomeModalState] = useState<FreeBetOutcomeModalState | null>(null);
  const [followUpReminderEditorState, setFollowUpReminderEditorState] =
    useState<FreeBetFollowUpReminderEditorState | null>(null);
  const [isFollowUpReminderSaving, setIsFollowUpReminderSaving] = useState(false);
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
  const [settledDeleteGuardRowId, setSettledDeleteGuardRowId] = useState<string | null>(null);
  const [settledDeleteReason, setSettledDeleteReason] = useState("");
  const [activeEditorTabId, setActiveEditorTabId] = useState<FreeBetEditorTabId>("setup");
  const [freeBetLayWorkflowModeOverride, setFreeBetLayWorkflowModeOverride] =
    useState<LayWorkflowMode | null>(null);
  const [freeBetCustomSliderMin, setFreeBetCustomSliderMin] = useState("");
  const [freeBetCustomSliderMax, setFreeBetCustomSliderMax] = useState("");
  const [freeBetCustomSliderDraftValue, setFreeBetCustomSliderDraftValue] = useState("");
  const [guidedEntryDismissed, setGuidedEntryDismissed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isPersisting, setIsPersisting] = useState(false);
  const editorRef = useRef<HTMLElement | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const ignoreInitialRecordIdRef = useRef(false);
  const loadRowsRequestIdRef = useRef(0);
  const isCreatingDraftRef = useRef(false);

  const isPersistingRef = useRef(false);
  const pageSize = 8;
  const isDirty = useMemo(
    () => JSON.stringify(formState) !== JSON.stringify(pristineFormState),
    [formState, pristineFormState]
  );
  const confirmDiscardChanges = useUnsavedChangesGuard(workflowVisible && isDirty);
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

  const hasOpenModal = workflowVisible || isFilterModalOpen || Boolean(outcomeModalState);

  useToastDismiss(statusMessage, clearStatusMessage);
  useBodyScrollLock(hasOpenModal);
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
    const requestId = ++loadRowsRequestIdRef.current;
    const url = `${apiBaseUrl}/profiles/${profileId}/free-bets`;
    const cachedRows = readCachedJson<FreeBetRecord[]>(url, TRACKER_STALE_WHILE_REFRESH_MS);
    if (cachedRows && requestId === loadRowsRequestIdRef.current) {
      setRows(cachedRows);
      setIsInitialLoading(false);
    }

    const nextRows = await fetchJsonAndCache<FreeBetRecord[]>(url);
    if (requestId !== loadRowsRequestIdRef.current) {
      return;
    }
    startTransition(() => {
      if (requestId !== loadRowsRequestIdRef.current) {
        return;
      }
      setRows(nextRows);
      setIsInitialLoading(false);
      const nextSelectedCandidate =
        preferredSelection === undefined ? selectedIdRef.current : preferredSelection;
      const selected =
        nextSelectedCandidate &&
        nextRows.some((row) => row.free_bet_id === nextSelectedCandidate)
          ? nextSelectedCandidate
          : null;
      const shouldPreserveEditorStep = Boolean(
        selected && selected === selectedIdRef.current && workflowVisible
      );
      setSelectedId(selected);
      if (selected) {
        isCreatingDraftRef.current = false;
        if (!shouldPreserveEditorStep) {
          setActiveEditorTabId("setup");
          setFreeBetLayWorkflowModeOverride(null);
          setFreeBetCustomSliderMin("");
          setFreeBetCustomSliderMax("");
          setFreeBetCustomSliderDraftValue("");
        }
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
  }, [profileId, startTransition, workflowVisible]);

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
    setActiveEditorTabId("setup");
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
        loadRows(ignoreInitialRecordIdRef.current ? undefined : initialRecordId),
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
    initialRecordId,
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

  const updateTrackerDatePreset = useCallback(
    async (preset: DatePreset) => {
      if (!trackerSettings || trackerSettings.active_date_preset === preset) return;
      setIsTrackerRangeSaving(true);
      setErrorMessage("");
      try {
        const savedSettings = await saveTrackerDatePreset(profileId, trackerSettings, preset);
        setTrackerSettings(savedSettings);
        setStatusMessage(`Tracker range set to ${preset}.`);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to save tracker range.");
      } finally {
        setIsTrackerRangeSaving(false);
      }
    },
    [profileId, trackerSettings]
  );

  const isNoLayStrategy = formState.match_strategy === "No Lay";
  const layWorkflowMode = getLayWorkflowModeForStrategy(formState.match_strategy);
  const freeBetLayWorkflowMode =
    freeBetLayWorkflowModeOverride ?? (layWorkflowMode === "Multilay" ? "Advanced" : layWorkflowMode);
  const freeBetCalculatorMode = getCalculatorModeForLayWorkflowMode(freeBetLayWorkflowMode);
  const showsLayMatchedStake =
    formState.match_strategy === "Partial Lay" || formState.match_strategy === "Custom";
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
  const editorLayStatus = isNoLayStrategy
    ? "Fully Laid"
    : activePreviewCalculation?.lay_status ?? selectedRow?.lay_status ?? "Not Laid";

  const missingOfferIdentityFields = useMemo(
    () => getMissingRequiredFields(formState),
    [formState]
  );
  const offerIdentityValidationActive = showOfferIdentityValidation;
  const resultOptions = useMemo(
    () => getFreeBetResultOptions(formState.match_strategy),
    [formState.match_strategy]
  );
  const resultSelectValue = normalizeFreeBetResultOption(formState.result, isNoLayStrategy);
  const quickSettlementOptions = useMemo(
    () => resultOptions.filter((option) => option !== "Pending" && option !== "Void").slice(0, 4),
    [resultOptions]
  );
  const missingPlacementFields = useMemo(
    () => getMissingPlacementFields(formState, resolvedCommission),
    [formState, resolvedCommission]
  );
  const missingCalculatorFields = useMemo(
    () => getFreeBetCalculatorMissingFields(formState, resolvedCommission),
    [formState, resolvedCommission]
  );
  const freeBetEditorTabs = useMemo<LedgerEditorTabDefinition[]>(
    () => [
      {
        id: "setup",
        label: "Bet Setup",
        requiredIssueCount: offerIdentityValidationActive ? missingOfferIdentityFields.length : 0,
        status:
          offerIdentityValidationActive && missingOfferIdentityFields.length > 0
            ? "invalid"
            : offerSetupComplete
              ? "complete"
              : "neutral",
      },
      {
        id: "matching",
        label: "Matching",
        requiredIssueCount:
          calculatorUnlocked && !previewReady ? missingCalculatorFields.length : 0,
        status: !calculatorUnlocked
          ? "locked"
          : calculatorUnlocked && !previewReady && missingCalculatorFields.length > 0
            ? "invalid"
            : previewReady
              ? "complete"
              : "neutral",
      },
      {
        id: "settlement",
        label: "Settlement",
        attentionState: getSettlementTabAttentionState({
          activeStatuses: ["Placed"],
          result: formState.result,
          settlementDate: formState.date_settled,
          status: formState.status,
        }),
        requiredIssueCount:
          offerIdentityValidationActive && missingPlacementFields.includes("Settles") ? 1 : 0,
        warningIssueCount:
          formState.manual_override_value.trim() && !formState.manual_override_reason.trim()
            ? 1
            : selectedRow?.follow_up_reminder_state === "Active"
              ? 1
              : 0,
        status:
          offerIdentityValidationActive && missingPlacementFields.includes("Settles")
            ? "invalid"
            : formState.manual_override_value.trim() && !formState.manual_override_reason.trim()
              ? "warning"
              : selectedRow?.follow_up_reminder_state === "Active"
                ? "warning"
                : formState.result !== "Pending" || formState.status === "Settled"
                  ? "complete"
                  : "neutral",
      },
    ],
    [
      calculatorUnlocked,
      formState.manual_override_reason,
      formState.manual_override_value,
      formState.date_settled,
      formState.result,
      formState.status,
      missingCalculatorFields.length,
      missingOfferIdentityFields.length,
      missingPlacementFields,
      offerIdentityValidationActive,
      offerSetupComplete,
      previewReady,
      selectedRow,
    ]
  );
  const safeActiveEditorTabId = freeBetEditorTabs.some(
    (tab) => tab.id === activeEditorTabId && tab.status !== "locked"
  )
    ? activeEditorTabId
    : (freeBetEditorTabs.find((tab) => tab.status !== "locked")?.id as
        | FreeBetEditorTabId
        | undefined) ?? "setup";
  const navigableFreeBetEditorTabs = freeBetEditorTabs.filter((tab) => tab.status !== "locked");
  const activeFreeBetEditorTabIndex = Math.max(
    0,
    navigableFreeBetEditorTabs.findIndex((tab) => tab.id === safeActiveEditorTabId)
  );
  const previousFreeBetEditorTab =
    activeFreeBetEditorTabIndex > 0
      ? navigableFreeBetEditorTabs[activeFreeBetEditorTabIndex - 1]
      : null;
  const nextFreeBetEditorTab =
    activeFreeBetEditorTabIndex >= 0 &&
    activeFreeBetEditorTabIndex < navigableFreeBetEditorTabs.length - 1
      ? navigableFreeBetEditorTabs[activeFreeBetEditorTabIndex + 1]
      : null;
  const activateFreeBetEditorTab = useCallback((tabId: FreeBetEditorTabId) => {
    setActiveEditorTabId(tabId);
  }, []);
  const activeDisplayedValue = getDisplayedValue(activePreviewCalculation, selectedRow);
  const activeDisplayedValueLabel = getDisplayedValueLabel(activePreviewCalculation, selectedRow);
  const activeDisplayedNumericValue = parseNumericInput(activeDisplayedValue);
  const freeBetStandardSuggestedLayStake =
    parseNumericInput(
      activePreviewCalculation?.base_reference_lay_stake ??
        selectedRow?.base_reference_lay_stake ??
        ""
    ) ??
    parseNumericInput(formState.lay_actual) ??
    parseNumericInput(formState.free_bet_value) ??
    5;
  const freeBetCustomSliderEffectiveMin =
    parseNumericInput(freeBetCustomSliderMin) ??
    Math.max(0.01, Number((freeBetStandardSuggestedLayStake - 1).toFixed(2)));
  const freeBetCustomSliderEffectiveMax =
    parseNumericInput(freeBetCustomSliderMax) ??
    Number((freeBetStandardSuggestedLayStake + 1).toFixed(2));
  const freeBetCustomSliderBoundedMax = Math.max(
    Number((freeBetCustomSliderEffectiveMin + 0.01).toFixed(2)),
    freeBetCustomSliderEffectiveMax
  );
  const freeBetCustomSliderDraftFloat = parseNumericInput(freeBetCustomSliderDraftValue);
  const freeBetCustomSliderCurrentFloat = Math.min(
    freeBetCustomSliderBoundedMax,
    Math.max(
      freeBetCustomSliderEffectiveMin,
      freeBetCustomSliderDraftFloat ??
        parseNumericInput(formState.lay_actual) ??
        freeBetStandardSuggestedLayStake
    )
  );
  const freeBetLaySuggestionCards = useMemo(
    () => {
      const stakeByMode: Record<SingleLayResultMode, string | null | undefined> = {
        Custom: formatPreviewMoney(freeBetCustomSliderCurrentFloat),
        Overlay:
          activePreviewCalculation?.overlay_reference_lay_stake ??
          selectedRow?.overlay_reference_lay_stake,
        Standard:
          activePreviewCalculation?.base_reference_lay_stake ??
          selectedRow?.base_reference_lay_stake,
        Underlay:
          activePreviewCalculation?.underlay_reference_lay_stake ??
          selectedRow?.underlay_reference_lay_stake,
      };

      return getSingleLayResultModes(freeBetCalculatorMode)
        .map((mode) => ({
          mode,
          stake: stakeByMode[mode] ?? "—",
        }))
        .filter((card) => card.stake !== "—");
    },
    [
      activePreviewCalculation,
      freeBetCalculatorMode,
      freeBetCustomSliderCurrentFloat,
      selectedRow,
    ]
  );
  const freeBetOutcomeCardFields = useMemo(
    () =>
      freeBetLaySuggestionCards.map((card) => ({
        ...card,
        preview: calculateFreeBetResultCardPreview({
          retentionMode: formState.retention_mode,
          freeBetValue: formState.free_bet_value,
          backOdds: formState.back_odds,
          layOdds: formState.lay_odds_1,
          layCommission: formState.lay_commission_1 || "0",
          layStake: card.stake,
        }),
      })),
    [
      formState.back_odds,
      formState.free_bet_value,
      formState.lay_commission_1,
      formState.lay_odds_1,
      formState.retention_mode,
      freeBetLaySuggestionCards,
    ]
  );
  const activeMatchRatingValue = useMemo(() => {
    if (isNoLayStrategy) {
      return null;
    }
    const backOdds = parseNumericInput(formState.back_odds);
    const layOdds = parseNumericInput(formState.lay_odds_1);
    if (backOdds === null || layOdds === null || layOdds <= 0) {
      return null;
    }
    return (backOdds / layOdds) * 100;
  }, [formState.back_odds, formState.lay_odds_1, isNoLayStrategy]);
  const activeMatchRatingDisplay =
    activeMatchRatingValue === null ? null : activeMatchRatingValue.toFixed(2);
  const activeMatchRatingTone =
    activeMatchRatingValue === null ? null : getMatchRatingPillTone(activeMatchRatingValue);
  const activeMatchRatingInterpretation =
    activeMatchRatingValue === null ? null : getMatchRatingInterpretation(activeMatchRatingValue);
  const freeBetCalculatorTitle = `Free Bet + ${formState.retention_mode || "Mode pending"} ${
    formState.bet_type || "Single"
  }`;
  const guidedEntry = useMemo(
    () =>
      getFreeBetGuidedEntry({
        calculatorUnlocked,
        formState,
        isNoLayStrategy,
        missingCalculatorFields,
        missingOfferIdentityFields,
        missingPlacementFields,
      }),
    [
      calculatorUnlocked,
      formState,
      isNoLayStrategy,
      missingCalculatorFields,
      missingOfferIdentityFields,
      missingPlacementFields,
    ]
  );
  const freeBetGuidedFallbackMessages = useMemo<Record<FreeBetGuidedFieldKey, string>>(
    () => ({
      back_odds: "Enter The Back Odds.",
      bet_type: "Choose The Bet Type.",
      bookmaker: "Choose The Bookmaker.",
      event_name: "Add The Event Name.",
      exchange: "Choose The Exchange.",
      fixture_type: "Choose The Fixture Type.",
      free_bet_value: "Enter The Free-Bet Value.",
      lay_actual: "Enter The Lay Stake.",
      lay_odds_1: "Enter The Lay Odds.",
      offer: "Add The Offer Name As Shown.",
      offer_type: "Choose The Offer Type.",
      result: "Confirm The Outcome.",
      settles: "Confirm The Settlement Date.",
    }),
    []
  );
  const safeGuidedEntry = useMemo(() => {
    if (guidedEntry.state === "complete") {
      return guidedEntry;
    }
    const nextRequiredField = guidedEntry.nextRequiredField ?? "offer";
    return {
      ...guidedEntry,
      nextRequiredField,
      message:
        guidedEntry.message.trim() ||
        freeBetGuidedFallbackMessages[nextRequiredField] ||
        "Continue The Guided Workflow.",
    };
  }, [freeBetGuidedFallbackMessages, guidedEntry]);
  const guidedEntryVisible =
    workflowVisible && guidedAccessEnabled && !guidedEntryDismissed && safeGuidedEntry.state !== "complete";
  const guidedEntryMessageId = "free-bet-guided-entry-message";
  const guidedEntryTargetTabId = safeGuidedEntry.nextRequiredField
    ? freeBetGuidedFieldTabMap[safeGuidedEntry.nextRequiredField]
    : null;
  const guidedEntryNeedsTabJump =
    guidedEntryTargetTabId !== null && guidedEntryTargetTabId !== safeActiveEditorTabId;
  const guidedEntryTargetTabIndex = guidedEntryTargetTabId
    ? freeBetEditorTabs.findIndex((tab) => tab.id === guidedEntryTargetTabId)
    : -1;
  const guidedEntryTargetTabLabel = guidedEntryTargetTabId
    ? freeBetGuidedTabLabels[guidedEntryTargetTabId]
    : "";
  const guidedEntryMessageText =
    safeGuidedEntry.message.trim() ||
    (safeGuidedEntry.nextRequiredField
      ? freeBetGuidedFallbackMessages[safeGuidedEntry.nextRequiredField]
      : "Continue The Guided Workflow.");
  const guidedEntryResolvedInstruction =
    (
      guidedEntryNeedsTabJump
        ? `Go to ${guidedEntryTargetTabLabel} and ${guidedEntryMessageText}`
        : guidedEntryMessageText
    ).trim() || "Add The Offer Name As Shown.";
  const guidedEntryActionMessage = guidedEntryNeedsTabJump
    ? `Go to ${guidedEntryTargetTabLabel} and ${guidedEntryMessageText}`
    : guidedEntryMessageText;
  const guidedEntryPlainInstruction = guidedEntryResolvedInstruction;
  const getGuidedFieldClass = useCallback(
    (field: FreeBetGuidedFieldKey, extraClass = "") => {
      const classes = ["field-control"];
      if (extraClass) {
        classes.push(extraClass);
      }
      if (guidedEntryVisible && safeGuidedEntry.nextRequiredField === field) {
        classes.push("is-guided-next");
      }
      return classes.join(" ");
    },
    [guidedEntryVisible, safeGuidedEntry.nextRequiredField]
  );
  const getGuidedFieldData = useCallback(
    (field: FreeBetGuidedFieldKey) => ({
      "data-guided-field": field,
    }),
    []
  );
  const getGuidedDescribedBy = useCallback(
    (field: FreeBetGuidedFieldKey) =>
      guidedEntryVisible && safeGuidedEntry.nextRequiredField === field
        ? guidedEntryMessageId
        : undefined,
    [guidedEntryVisible, safeGuidedEntry.nextRequiredField]
  );
  const focusGuidedEntryTarget = useCallback(() => {
    const nextField = safeGuidedEntry.nextRequiredField;
    if (!nextField) return;
    const nextTab = freeBetGuidedFieldTabMap[nextField];
    activateFreeBetEditorTab(nextTab);
    window.setTimeout(() => {
      const target = editorRef.current?.querySelector<HTMLElement>(
        `[data-guided-field="${nextField}"]`
      );
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusTarget =
        target?.matches("input, select, textarea, button")
          ? target
          : target?.querySelector<HTMLElement>("input, select, textarea, button");
      focusTarget?.focus({ preventScroll: true });
    }, 80);
  }, [activateFreeBetEditorTab, safeGuidedEntry.nextRequiredField]);
  const renderGuidedEntryMessage = useCallback((message: string) => {
    const safeMessage = message.trim() || "Continue The Guided Workflow.";
    const targetTerms = [
      "Settlement Date",
      "Offer Name",
      "Free-Bet Value",
      "Fixture Type",
      "Event Name",
      "Offer Type",
      "Bet Type",
      "Bookmaker",
      "Exchange",
      "Settlement",
      "Outcome",
      "Back",
      "Lay",
    ];
    const pattern = new RegExp(`(${targetTerms.join("|")})`, "g");
    const parts = safeMessage.split(pattern).filter(Boolean);
    if (parts.length === 0) {
      return <>{safeMessage}</>;
    }
    return (
      <>
        {parts.map((part, index) => {
          const toneClass =
            part === "Back"
              ? "guided-entry-token-back"
              : part === "Lay"
                ? "guided-entry-token-lay"
                : targetTerms.includes(part)
                  ? "guided-entry-token-field"
                  : "";
          return toneClass ? (
            <span className={`guided-entry-token ${toneClass}`} key={`${part}-${index}`}>
              {part}
            </span>
          ) : (
            <span key={`${part}-${index}`}>{part}</span>
          );
        })}
      </>
    );
  }, []);
  const renderGuidedEntryInstruction = useCallback(() => {
    if (!guidedEntryNeedsTabJump) {
      return <span className="guided-entry-instruction-text">{renderGuidedEntryMessage(guidedEntryResolvedInstruction)}</span>;
    }

    return (
      <span className="guided-entry-instruction-text">
        <span>Go to </span>
        <span className="guided-entry-step-reference">
          {guidedEntryTargetTabIndex >= 0 ? (
            <span aria-hidden="true" className="guided-entry-step-marker">
              {guidedEntryTargetTabIndex + 1}
            </span>
          ) : null}
          <span>{guidedEntryTargetTabLabel}</span>
        </span>
        <span> and </span>
        {renderGuidedEntryMessage(guidedEntryMessageText || guidedEntryResolvedInstruction)}
      </span>
    );
  }, [
    guidedEntryMessageText,
    guidedEntryNeedsTabJump,
    guidedEntryResolvedInstruction,
    guidedEntryTargetTabIndex,
    guidedEntryTargetTabLabel,
    renderGuidedEntryMessage,
  ]);
  const renderSettledLockAction = useCallback(
    () => {
      if (!selectedId) {
        return null;
      }

      return isSettledReadOnly ? (
        <button
          className="section-lock-chip section-lock-chip-action"
          data-pd-id="free-bets.editor.edit-settled-row"
          onClick={() => setSettledEditEnabled(true)}
          type="button"
        >
          EDIT
        </button>
      ) : (
        <span className="section-lock-chip" data-pd-id="free-bets.editor.editing-state">
          EDITING
        </span>
      );
    },
    [isSettledReadOnly, selectedId]
  );
  const renderEditorSectionAside = useCallback(
    (extra?: ReactNode) => {
      const editState = renderSettledLockAction();
      if (!editState && !extra) {
        return null;
      }

      return (
        <>
          {editState}
          {extra}
        </>
      );
    },
    [renderSettledLockAction]
  );

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

    if (feeReviewContext) {
      return nextRows.sort((left, right) => left.free_bet_id.localeCompare(right.free_bet_id));
    }

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
  }, [feeReviewContext, rows, tableMode]);

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
      if (
        !initialIssueFilter &&
        !feeReviewContext &&
        !isDateWithinResolvedRange(getFreeBetRangeAnchor(row), resolvedDateRange)
      ) {
        return false;
      }
      if (feeReviewContext && !feeReviewContext.recordIds.includes(row.free_bet_id)) {
        return false;
      }
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
  }, [feeReviewContext, initialIssueFilter, resolvedDateRange, sortedReviewRows, tableFilters]);

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
    const rangeRows = initialIssueFilter
      ? rows
      : rows.filter((row) =>
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
  }, [initialIssueFilter, resolvedDateRange, rows]);
  const quickViewRangeContext = initialIssueFilter
    ? "Action filter: all dates"
    : formatResolvedDateRange(resolvedDateRange);
  const quickViewRangeDetail = initialIssueFilter
    ? "Action filter: all dates"
    : formatResolvedDateRangeContext(resolvedDateRange);

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

  async function selectRow(rowId: string, options?: { collapseTable?: boolean }) {
    if (rowId !== selectedId && isDirty && !(await confirmDiscardChanges())) {
      return;
    }
    const record = rows.find((entry) => entry.free_bet_id === rowId);
    if (!record) {
      return;
    }
    setSelectedId(rowId);
    setActiveEditorTabId("setup");
    setFreeBetLayWorkflowModeOverride(null);
    setFreeBetCustomSliderMin("");
    setFreeBetCustomSliderMax("");
    setFreeBetCustomSliderDraftValue("");
    setFollowUpReminderEditorState(null);
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
    setStatusMessage("");
    revealEditor({ expandLedger: !options?.collapseTable });
  }

  async function startNewRow() {
    if (isDirty && !(await confirmDiscardChanges())) {
      return;
    }
    setSelectedId(null);
    selectedIdRef.current = null;
    setActiveEditorTabId("setup");
    setFreeBetLayWorkflowModeOverride(null);
    setFreeBetCustomSliderMin("");
    setFreeBetCustomSliderMax("");
    setFreeBetCustomSliderDraftValue("");
    setFollowUpReminderEditorState(null);
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
    setStatusMessage("");
    revealEditor({ expandLedger: true });
  }

  async function closeEditor() {
    if (isPersistingRef.current) {
      return;
    }
    if (isDirty && !(await confirmDiscardChanges())) {
      return;
    }
    setWorkflowVisible(false);
    setSelectedId(null);
    selectedIdRef.current = null;
    setFollowUpReminderEditorState(null);
    ignoreInitialRecordIdRef.current = true;
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
    if (isPersistingRef.current) {
      return false;
    }

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

    isPersistingRef.current = true;
    setIsPersisting(true);

    try {
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
      const savedFormState = recordToForm(saved);
      invalidateCachedJson(`${apiBaseUrl}/profiles/${profileId}/free-bets`);
      dispatchTrackerDataUpdated({ ledger: "free-bets", profileId });
      setRows((current) => {
        const rowExists = current.some((row) => row.free_bet_id === saved.free_bet_id);
        return rowExists
          ? current.map((row) => (row.free_bet_id === saved.free_bet_id ? saved : row))
          : [saved, ...current];
      });
      const returnToLedger = options?.returnToLedgerOnSuccess ?? !options?.autosaveLabel;
      if (returnToLedger) {
        ignoreInitialRecordIdRef.current = true;
      }
      setSelectedId(returnToLedger ? null : saved.free_bet_id);
      selectedIdRef.current = returnToLedger ? null : saved.free_bet_id;
      setFormState(savedFormState);
      setPristineFormState(savedFormState);
      await loadRows(returnToLedger ? null : saved.free_bet_id);
      setShowOfferIdentityValidation(false);
      setSettledEditEnabled(false);
      if (returnToLedger) {
        const blankFormState = createBlankForm();
        setSelectedId(null);
        selectedIdRef.current = null;
        setFormState(blankFormState);
        setPristineFormState(blankFormState);
        setWorkflowVisible(false);
        setTableCollapsed(false);
        isCreatingDraftRef.current = false;
        setStatusMessage("");
      } else if (!workflowVisible) {
        setStatusMessage(
          options?.autosaveLabel
            ? `${options.autosaveLabel} autosaved for ${saved.free_bet_id}.`
            : isEditing
              ? `Updated free bet ${saved.free_bet_id}.`
              : `Created free bet ${saved.free_bet_id}.`
        );
      } else {
        setStatusMessage("");
      }
      return true;
    } finally {
      isPersistingRef.current = false;
      setIsPersisting(false);
    }
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

  function applyFreeBetLayWorkflowMode(mode: LayWorkflowMode) {
    if (!freeBetLayWorkflowModeOptions.includes(mode)) {
      return;
    }
    setFreeBetLayWorkflowModeOverride(mode);
    setFormState((current) =>
      applyStrategyDefaults(
        current,
        mode === "Advanced" && current.match_strategy === "No Lay"
          ? "Standard"
          : getStrategyForLayWorkflowMode(mode, current.match_strategy)
      )
    );
  }

  function handleResetForm() {
    if (isPersistingRef.current) {
      return;
    }

    if (selectedRow) {
      const nextFormState = recordToForm(selectedRow);
      setPreviewCalculation(null);
      setActiveEditorTabId("setup");
      setFreeBetLayWorkflowModeOverride(null);
      setFreeBetCustomSliderMin("");
      setFreeBetCustomSliderMax("");
      setFreeBetCustomSliderDraftValue("");
      setFormState(nextFormState);
      setPristineFormState(nextFormState);
      setErrorMessage("");
      setShowOfferIdentityValidation(false);
      setSettledEditEnabled(false);
      setSettledDeleteGuardRowId(null);
      setSettledDeleteReason("");
      setStatusMessage(`Reverted unsaved changes for free bet ${selectedRow.free_bet_id}.`);
      return;
    }

    const blankForm = createBlankForm();
    setPreviewCalculation(null);
    setActiveEditorTabId("setup");
    setFreeBetLayWorkflowModeOverride(null);
    setFreeBetCustomSliderMin("");
    setFreeBetCustomSliderMax("");
    setFreeBetCustomSliderDraftValue("");
    setFormState(blankForm);
    setPristineFormState(blankForm);
    setErrorMessage("");
    setShowOfferIdentityValidation(false);
    setSettledEditEnabled(false);
    setSettledDeleteGuardRowId(null);
    setSettledDeleteReason("");
    setStatusMessage("Cleared the unsaved free-bet draft.");
  }

  function handleCancelSettledEdit() {
    setPreviewCalculation(null);
    setFreeBetLayWorkflowModeOverride(null);
    setFreeBetCustomSliderMin("");
    setFreeBetCustomSliderMax("");
    setFreeBetCustomSliderDraftValue("");
    setFormState(pristineFormState);
    setErrorMessage("");
    setShowOfferIdentityValidation(false);
    setSettledEditEnabled(false);
    setSettledDeleteGuardRowId(null);
    setSettledDeleteReason("");
    setStatusMessage("");
  }

  async function handleDeleteSelectedRow(
    rowId = selectedId,
    options?: { confirmedSettledReason?: string }
  ) {
    if (!rowId) {
      return;
    }

    const rowForDelete =
      selectedRow?.free_bet_id === rowId
        ? selectedRow
        : rows.find((row) => row.free_bet_id === rowId);
    const isSettledDelete = rowForDelete ? rowForDelete.status === "Settled" : formState.status === "Settled";
    const settledReason = options?.confirmedSettledReason?.trim() ?? "";

    if (isSettledDelete && !settledReason) {
      setSettledDeleteGuardRowId(rowId);
      setSettledDeleteReason("");
      setErrorMessage("");
      return;
    }

    if (!isSettledDelete) {
      const confirmed = await confirmDestructiveAction({
        confirmLabel: "Delete Row",
        message: `Delete free-bet row ${rowId}? This will remove it from this profile tracker.`,
        title: "Delete free-bet row?",
      });
      if (!confirmed) {
        return;
      }
    }

    setErrorMessage("");
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/free-bets/${rowId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const detail = await response.text();
      setErrorMessage(detail || "Unable to delete free-bet row");
      return;
    }

    invalidateCachedJson(`${apiBaseUrl}/profiles/${profileId}/free-bets`);
    dispatchTrackerDataUpdated({ ledger: "free-bets", profileId });
    await loadRows(null);
    if (selectedId === rowId) setWorkflowVisible(false);
    setPreviewCalculation(null);
    setStatusMessage(`Deleted free bet ${rowId}.`);
    if (feeReviewContext) await refreshFeeReviewResolutionSession(apiBaseUrl, feeReviewContext);
  }

  async function applySuggestedLayValue(mode: Exclude<SingleLayResultMode, "Custom">) {
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
      lay_matched_stake_1: suggested,
      status: current.status === "Available" || current.status === "Prospecting" ? "Placed" : current.status,
      result: current.result || "Pending",
    }));

    const copied = await copyToClipboard(suggested);
    setStatusMessage(
      copied
        ? `Applied ${mode.toLowerCase()} best-value lay ${suggested}, switched strategy to ${mode}, and copied it to the clipboard.`
        : `Applied ${mode.toLowerCase()} best-value lay ${suggested} and switched strategy to ${mode}.`
    );
  }

  async function applyCustomLayValue() {
    const value =
      freeBetCustomSliderDraftValue.trim() ||
      formState.lay_actual.trim() ||
      formatPreviewMoney(freeBetCustomSliderCurrentFloat);
    if (!value) {
      return;
    }

    setFormState((current) => ({
      ...current,
      lay_actual: value,
      lay_matched_stake_1: value,
      match_strategy: "Custom",
      result: current.result || "Pending",
      status: current.status === "Available" || current.status === "Prospecting" ? "Placed" : current.status,
    }));

    const copied = await copyToClipboard(value);
    setStatusMessage(
      copied
        ? "Applied custom lay, marked it fully placed, and copied it to the clipboard."
        : "Applied custom lay and marked it fully placed."
    );
  }

  function commitFreeBetCustomSliderValue(value?: string) {
    const nextValue = formatPreviewMoney(
      parseNumericInput(value ?? freeBetCustomSliderDraftValue) ??
        freeBetCustomSliderCurrentFloat
    );
    setFreeBetCustomSliderDraftValue("");
    setFormState((current) => {
      if (current.lay_actual === nextValue) {
        return current;
      }
      return {
        ...current,
        lay_actual: nextValue,
      };
    });
  }

  function openFollowUpReminderEditor(record: FreeBetRecord) {
    const wasActive = record.follow_up_reminder_state === "Active";
    const cutoff = record.status === "Placed" ? record.date_settled : record.expiry_datetime;
    setFollowUpReminderEditorState({
      rowId: record.free_bet_id,
      due_at:
        (wasActive ? toDateTimeLocalValue(record.follow_up_reminder_due_at) : "") ||
        getFollowUpReminderDefaultDueAt(toDateTimeLocalValue(cutoff)),
      reason: wasActive ? record.follow_up_reminder_reason : "",
      resolution_note: "",
      wasActive,
    });
  }

  async function submitFollowUpReminder(state: "Active" | "Resolved" | "Dismissed") {
    if (!followUpReminderEditorState) return;

    setErrorMessage("");
    setIsFollowUpReminderSaving(true);
    try {
      if (isDirty) {
        const rowSaved = await persistForm(formState, {
          autosaveLabel: "Free-bet reminder row",
          returnToLedgerOnSuccess: false,
        });
        if (!rowSaved) return;
      }

      const response = await fetch(
        `${apiBaseUrl}/profiles/${profileId}/free-bets/${followUpReminderEditorState.rowId}/follow-up-reminder`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            state,
            due_at: fromDateTimeLocalValue(followUpReminderEditorState.due_at),
            reason: followUpReminderEditorState.reason,
            resolution_note: followUpReminderEditorState.resolution_note,
            actor_id: "fund-manager-local",
          }),
        }
      );
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as { detail?: string } | null;
        setErrorMessage(detail?.detail ?? "Unable to update the free-bet reminder.");
        return;
      }

      const updatedRecord = (await response.json()) as FreeBetRecord;
      invalidateCachedJson(`${apiBaseUrl}/profiles/${profileId}/free-bets`);
      dispatchTrackerDataUpdated({ ledger: "free-bets", profileId });
      setRows((current) =>
        current.map((row) =>
          row.free_bet_id === updatedRecord.free_bet_id ? updatedRecord : row
        )
      );
      setFollowUpReminderEditorState(null);
      window.dispatchEvent(new Event(FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT));
      setStatusMessage(
        state === "Active"
          ? "Free-bet follow-up reminder saved."
          : state === "Resolved"
            ? "Free-bet follow-up reminder resolved with an audit note."
            : "Free-bet follow-up reminder dismissed with an audit note."
      );
    } finally {
      setIsFollowUpReminderSaving(false);
    }
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

    if (getSettlementValidationMessage(
      outcomeModalState.status,
      outcomeModalState.result,
      outcomeModalState.date_settled
    )) return;

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
      if (feeReviewContext) await refreshFeeReviewResolutionSession(apiBaseUrl, feeReviewContext);
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
            onClick={() => void selectRow(sourceRow.free_bet_id)}
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined">edit</span>
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
            <span aria-hidden="true" className="material-symbols-outlined">sports_score</span>
          </button>
          <button
            aria-label={`Delete free-bet row ${sourceRow.free_bet_id}`}
            className="icon-button icon-button-destructive table-action-button"
            onClick={() => void handleDeleteSelectedRow(sourceRow.free_bet_id)}
            title={`Delete ${sourceRow.free_bet_id}`}
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined">delete</span>
          </button>
        </div>
      );
    }

    if (column.key === "displayed_value") {
      const label = String(row.displayed_value_label ?? "Value");
      const numericValue = parseCurrencyLikeValue(value);
      return <LedgerValueCell fallback={value} label={label} value={numericValue} />;
    }

    return <span className="table-cell-text">{value}</span>;
  }

  return (
    <section className="stack">
      {feeReviewContext ? (
        <FeeReviewResolutionBanner
          context={feeReviewContext}
          hasUnsavedChanges={isDirty}
          onSaveAndLeave={() => persistForm(formState, { returnToLedgerOnSuccess: false })}
        />
      ) : null}
      {!workflowVisible ? (
        <StatusToast message={statusMessage} onDismiss={clearStatusMessage} />
      ) : null}
      <section
        aria-busy={isInitialLoading}
        className="content-panel stack sportsbook-page-shell"
      >
        <div className="sportsbook-page-header">
          <h1 className="sportsbook-page-title">Free Bets</h1>
        </div>
        {isInitialLoading ? (
          <LedgerLoadingIndicator label="Loading free-bet ledger" />
        ) : null}
        <section className="stat-strip" aria-label="Free-bet quick view">
          <TrackerRangeCard
            activePreset={trackerSettings?.active_date_preset ?? "Week (Mon-Sun)"}
            isActionView={Boolean(initialIssueFilter)}
            isSaving={isTrackerRangeSaving}
            onPresetChange={(preset) => void updateTrackerDatePreset(preset)}
            rangeDetail={quickViewRangeDetail}
            rangeContext={quickViewRangeContext}
          />
          <article className="stat-card">
            <span className="eyebrow">Open / overdue</span>
            <strong>{quickView.openCount} / {quickView.overdueCount}</strong>
            <span>Open rows • Overdue rows</span>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Placed / available</span>
            <strong>{quickView.placedCount} / {quickView.availableCount}</strong>
            <span>Placed rows • Available awards</span>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Underlays / no lay</span>
            <strong>{quickView.underlayCount} / {quickView.noLayCount}</strong>
            <span>Underlay rows • No-lay rows</span>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Expiry watch</span>
            <strong>{quickView.missingExpiryCount} / {quickView.upcomingExpiryCount}</strong>
            <span>Missing Expiry / Upcoming Expiry</span>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Resolved value</span>
            <strong><FinancialValue value={quickView.totalReportingValue} /></strong>
            <span>Current ledger total</span>
          </article>
        </section>
        <div className="sportsbook-review-bar" aria-label="Free-bet ledger controls" role="toolbar">
          <label className="field-control table-search-field">
            <span className="visually-hidden">Search free-bet rows</span>
            <input
              aria-label="Search free-bet rows"
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search free-bet rows"
              type="search"
              value={query}
            />
          </label>
          <LedgerAddRowButton label="Add free-bet row" onClick={() => void startNewRow()} />
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
                          onClick={() => void selectRow(rowId)}
                          onDoubleClick={() => void selectRow(rowId, { collapseTable: true })}
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
              <button
                aria-describedby="free-bet-outcome-validation"
                className="modal-primary-button"
                disabled={Boolean(getSettlementValidationMessage(outcomeModalState.status, outcomeModalState.result, outcomeModalState.date_settled))}
                onClick={() => void submitOutcomeModal()}
                type="button"
              >
                Save
              </button>
            </div>
            <span className="field-help field-span-2" id="free-bet-outcome-validation" role="status">
              {getSettlementValidationMessage(outcomeModalState.status, outcomeModalState.result, outcomeModalState.date_settled)}
            </span>
          </section>
        </div>
      ) : null}

      {workflowVisible ? (
        <div className="modal-backdrop" onClick={() => void closeEditor()}>
      <section
        aria-label={selectedId ? "Edit free-bet row" : "Create free-bet row"}
        aria-busy={isPersisting}
        aria-modal="true"
        className="content-panel stack workflow-editor-panel modal-panel workflow-editor-modal"
        data-pd-id="free-bets.editor.dialog"
        onClick={(event) => event.stopPropagation()}
        ref={editorRef}
        role="dialog"
      >
        <div className="workflow-panel-header workflow-editor-header" data-pd-id="free-bets.editor.header">
          <div className="stack workflow-editor-title-stack">
            <span className="eyebrow">{selectedId ? "Edit free-bet row" : "Create free-bet row"}</span>
            <strong className="workflow-header-title" title={editorHeaderFullTitle}>{editorHeaderTitle}</strong>
          </div>
          <section
            aria-label="Free-bet editor context"
            className="editor-compact-summary"
            data-pd-id="free-bets.editor.compact-summary"
          >
            <span
              className="table-chip editor-summary-value-chip"
              title={`${activeDisplayedValueLabel}: ${activeDisplayedValue}`}
            >
              {activeDisplayedNumericValue === null ? (
                <span className="ledger-financial-value ledger-financial-value-unavailable">
                  £ -
                </span>
              ) : (
                <FinancialValue
                  animate={false}
                  className="ledger-financial-value editor-summary-financial-value"
                  label={activeDisplayedValueLabel}
                  value={activeDisplayedNumericValue}
                  zeroTone="neutral"
                />
              )}
            </span>
            <span className="table-chip">{formState.status || "Available"}</span>
            <span className={`table-chip${getFreeBetStrategyToneClass(formState.match_strategy)}`}>
              {formState.match_strategy || "Standard"}
            </span>
            <span
              className={`table-chip${
                editorLayStatus === "Fully Laid"
                  ? " table-chip-lay-full"
                  : editorLayStatus === "Part Laid"
                    ? " table-chip-lay-partial"
                    : " table-chip-muted"
              }`}
            >
              {editorLayStatus}
            </span>
            <span className="table-chip">{formState.retention_mode || "SNR"}</span>
          </section>
          <div className="tracker-nav workflow-editor-header-actions">
            <div
              aria-label="Free-bet editor tab navigation"
              className="workflow-editor-header-nav"
              data-pd-id="free-bets.editor.tab-actions"
              role="group"
            >
              <button
                className="review-chip review-chip-action-previous"
                disabled={!previousFreeBetEditorTab}
                onClick={() => {
                  if (previousFreeBetEditorTab) {
                    activateFreeBetEditorTab(previousFreeBetEditorTab.id as FreeBetEditorTabId);
                  }
                }}
                type="button"
              >
                Previous
              </button>
              <button
                className="review-chip review-chip-action-next"
                disabled={!nextFreeBetEditorTab}
                onClick={() => {
                  if (nextFreeBetEditorTab) {
                    activateFreeBetEditorTab(nextFreeBetEditorTab.id as FreeBetEditorTabId);
                  }
                }}
                type="button"
              >
                Next
              </button>
            </div>
            <button
              aria-label="Close free-bet editor"
              className="workflow-editor-cancel-button"
              disabled={isPersisting}
              onClick={() => void closeEditor()}
              title="Close editor"
              type="button"
            >
              <span aria-hidden="true" className="material-symbols-outlined">close</span>
            </button>
          </div>
          <LedgerEditorTabRail
            activeTabId={safeActiveEditorTabId}
            ariaLabel="Free-bet editor sections"
            guidedTargetTabId={guidedEntryVisible ? guidedEntryTargetTabId : null}
            onActiveTabChange={(tabId) => activateFreeBetEditorTab(tabId as FreeBetEditorTabId)}
            tabs={freeBetEditorTabs}
          />
        </div>
        {guidedEntryVisible ? (
          <section
            aria-label="Free-bet guided entry"
            className={`guided-entry-banner guided-entry-banner-${safeGuidedEntry.state}`}
            data-pd-id="free-bets.guided-entry"
            key={`${safeGuidedEntry.state}:${safeGuidedEntry.nextRequiredField ?? "none"}:${guidedEntryActionMessage}`}
            role="status"
          >
            <button className="guided-entry-action" onClick={focusGuidedEntryTarget} type="button">
              <span className="eyebrow">
                {safeGuidedEntry.state === "review_required" ? "Review required" : "Next required"}
              </span>
              <strong aria-label={guidedEntryPlainInstruction} id={guidedEntryMessageId}>{renderGuidedEntryInstruction()}</strong>
            </button>
            <button
              aria-label="Dismiss free-bet guided entry"
              className="icon-button guided-entry-dismiss"
              onClick={() => setGuidedEntryDismissed(true)}
              title="Dismiss guided entry"
              type="button"
            >
              <span aria-hidden="true" className="material-symbols-outlined">
                close
              </span>
            </button>
          </section>
        ) : guidedAccessEnabled && guidedEntryDismissed && safeGuidedEntry.state !== "complete" ? (
          <button
            className="button-link guided-entry-restore"
            data-pd-id="free-bets.guided-entry.restore"
            onClick={() => setGuidedEntryDismissed(false)}
            type="button"
          >
            Show guide
          </button>
        ) : null}
        <div className="workflow-editor-body">
        <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
          <LedgerEditorTabPanel activeTabId={safeActiveEditorTabId} tabId="setup">
          <EditorSection
            collapsible={false}
            headerAside={
              renderEditorSectionAside()
            }
            invalid={offerIdentityValidationActive && missingOfferIdentityFields.length > 0}
            title="Offer setup"
          >
            {offerIdentityValidationActive && missingOfferIdentityFields.length > 0 ? (
              <EditorValidationBanner
                dismissKey={`free-bet-offer:${selectedId ?? formState.free_bet_id ?? "new"}:${missingOfferIdentityFields.join("|")}`}
                id="free-bet.editor.offer-validation"
                message={`Complete these fields before saving: ${missingOfferIdentityFields.join(", ")}.`}
                title="Offer setup incomplete"
              />
            ) : null}
            <fieldset className="section-fieldset" disabled={isSettledReadOnly}>
            <div className="form-grid">
              <label
                className={getGuidedFieldClass("offer")}
                {...getGuidedFieldData("offer")}
              >
                <span>Offer</span>
                <input
                  aria-describedby={getGuidedDescribedBy("offer")}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, offer_text: event.target.value }))
                  }
                  value={formState.offer_text}
                />
              </label>
              <label
                className={`${getGuidedFieldClass("bookmaker")}${
                  offerIdentityValidationActive && !formState.bookmaker.trim() ? " is-invalid" : ""
                }`}
                {...getGuidedFieldData("bookmaker")}
              >
                <span>Bookmaker</span>
                <select
                  aria-describedby={getGuidedDescribedBy("bookmaker")}
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
              <label
                className={`${getGuidedFieldClass("offer_type")}${
                offerIdentityValidationActive && !formState.offer_type.trim() ? " is-invalid" : ""
                }`}
                {...getGuidedFieldData("offer_type")}
              >
                <span>Offer type (promotion mechanism)</span>
                <select
                  aria-describedby={getGuidedDescribedBy("offer_type")}
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
                <input
                  maxLength={120}
                  onBlur={() =>
                    void applyDropdownChange((current) => current, "Campaign tag change")
                  }
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      offer_name: event.target.value,
                    }))
                  }
                  placeholder="Enter a campaign tag"
                  type="text"
                  value={formState.offer_name}
                />
              </label>
              <label
                className={getGuidedFieldClass("bet_type")}
                {...getGuidedFieldData("bet_type")}
              >
                <span>Bet type (bet shape / placement)</span>
                <select
                  aria-describedby={getGuidedDescribedBy("bet_type")}
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
              <label
                className={getGuidedFieldClass("fixture_type")}
                {...getGuidedFieldData("fixture_type")}
              >
                <span>Fixture type</span>
                <select
                  aria-describedby={getGuidedDescribedBy("fixture_type")}
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
                <div
                  aria-label="Common fixture shortcuts"
                  className="field-choice-pills"
                  data-pd-id="free-bets.editor.fixture-type-picks"
                  role="group"
                >
                  {commonFixtureQuickPicks
                    .filter((option) => fixtureTypeOptionsResolved.includes(option))
                    .map((option) => (
                      <button
                        aria-pressed={formState.fixture_type === option}
                        className={`field-choice-pill${
                          formState.fixture_type === option ? " is-selected" : ""
                        }`}
                        key={option}
                        onClick={() =>
                          void applyDropdownChange(
                            (current) => ({ ...current, fixture_type: option }),
                            "Fixture type quick pick"
                          )
                        }
                        type="button"
                      >
                        {option}
                      </button>
                    ))}
                </div>
              </label>
              <label
                className={`${getGuidedFieldClass("event_name")}${
                  offerIdentityValidationActive && !formState.event_name.trim() ? " is-invalid" : ""
                }`}
                {...getGuidedFieldData("event_name")}
              >
                <span>Event name</span>
                <input
                  aria-describedby={getGuidedDescribedBy("event_name")}
                  aria-invalid={offerIdentityValidationActive && !formState.event_name.trim()}
                  onChange={(event) => setFormState((current) => ({ ...current, event_name: event.target.value }))}
                  required
                  value={formState.event_name}
                />
              </label>
            </div>
            </fieldset>
          </EditorSection>
          </LedgerEditorTabPanel>
          <LedgerEditorTabPanel activeTabId={safeActiveEditorTabId} tabId="matching">
          <EditorSection
            collapsible={false}
            headerAside={renderEditorSectionAside(
              !isSettledReadOnly && !calculatorUnlocked ? (
                <span className="section-lock-chip">{calculatorLockReason}</span>
              ) : null
            )}
            invalid={offerIdentityValidationActive && missingPlacementFields.length > 0}
            title="Matching"
          >
            {offerIdentityValidationActive && missingPlacementFields.length > 0 ? (
              <EditorValidationBanner
                dismissKey={`free-bet-placement:${selectedId ?? formState.free_bet_id ?? "new"}:${missingPlacementFields.join("|")}`}
                id="free-bet.editor.placement-validation"
                message={`Complete these placed/settled fields: ${missingPlacementFields.join(", ")}.`}
                title="Placement incomplete"
              />
            ) : null}
            <fieldset className="section-fieldset" disabled={isSettledReadOnly || !calculatorUnlocked}>
            <div className="calculator-panel-shell">
              <div className="calculator-panel-heading">
                <div className="calculator-panel-heading-row">
                  <strong>{freeBetCalculatorTitle}</strong>
                  {activeMatchRatingDisplay && activeMatchRatingTone ? (
                    <span
                      className={`table-chip calculator-match-rating-pill calculator-match-rating-pill-${activeMatchRatingTone}`}
                      data-pd-id="free-bets.matching.match-rating"
                    >
                      Match Rating {activeMatchRatingDisplay}% · {activeMatchRatingInterpretation}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="calculator-shell">
                <div className="calculator-band calculator-band-primary">
                  <span className="eyebrow">Calculator</span>
                  {calculatorUnlocked && !previewReady && missingCalculatorFields.length > 0 ? (
                    <EditorValidationBanner
                      dismissKey={`free-bet-calculator:${selectedId ?? formState.free_bet_id ?? "new"}:${missingCalculatorFields.join("|")}`}
                      id="free-bet.editor.calculator-validation"
                      message={`Complete these calculator inputs: ${missingCalculatorFields.join(", ")}.`}
                      title="Calculator inputs incomplete"
                    />
                  ) : null}
                  <div className="ledger-calculator-mode-bar" data-pd-id="free-bets.matching.calculator-mode">
                    <label className="field-control ledger-calculator-mode-field">
                      <span>Calc Type</span>
                      <input
                        aria-label="Free-bet calculator type"
                        readOnly
                        value={`${formState.retention_mode || "SNR"} ${formState.bet_type || "Single"}`}
                      />
                    </label>
                    <label className="field-control ledger-calculator-mode-field">
                      <span>Lay Mode</span>
                      <select
                        aria-label="Free-bet lay mode"
                        onChange={(event) =>
                          applyFreeBetLayWorkflowMode(event.target.value as LayWorkflowMode)
                        }
                        value={freeBetLayWorkflowMode}
                      >
                        {freeBetLayWorkflowModeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="form-grid calculator-input-grid">
                    <div className="field-span-2 calculator-segment calculator-segment-back">
                      <div className="calculator-segment-heading">
                        <span className="eyebrow">Back Bet</span>
                      </div>
                      <div className="calculator-segment-grid calculator-segment-grid-back">
                        <label
                          className={`${getGuidedFieldClass("free_bet_value")}${
                            calculatorUnlocked && missingCalculatorFields.includes("Free-bet value")
                              ? " is-invalid"
                              : ""
                          }`}
                          {...getGuidedFieldData("free_bet_value")}
                        >
                          <span>Free-bet value</span>
                          <input
                            aria-describedby={getGuidedDescribedBy("free_bet_value")}
                            aria-invalid={calculatorUnlocked && missingCalculatorFields.includes("Free-bet value")}
                            onChange={(event) =>
                              setFormState((current) => ({ ...current, free_bet_value: event.target.value }))
                            }
                            value={formState.free_bet_value}
                          />
                        </label>
                        <label
                          className={`${getGuidedFieldClass("back_odds")}${
                            calculatorUnlocked && missingCalculatorFields.includes("Back odds")
                              ? " is-invalid"
                              : ""
                          }`}
                          {...getGuidedFieldData("back_odds")}
                        >
                          <span>Back odds</span>
                          <input
                            aria-describedby={getGuidedDescribedBy("back_odds")}
                            aria-invalid={calculatorUnlocked && missingCalculatorFields.includes("Back odds")}
                            onChange={(event) =>
                              setFormState((current) => ({ ...current, back_odds: event.target.value }))
                            }
                            value={formState.back_odds}
                          />
                        </label>
                      </div>
                    </div>
                    {!isNoLayStrategy ? (
                      <div className="field-span-2 calculator-segment calculator-segment-lay">
                        <div className="calculator-segment-heading">
                          <span className="eyebrow">Lay / Exchange</span>
                          <span
                            className={`table-chip${
                              editorLayStatus === "Fully Laid"
                                ? " table-chip-lay-full"
                                : editorLayStatus === "Part Laid"
                                  ? " table-chip-lay-partial"
                                  : " table-chip-muted"
                            }`}
                          >
                            {editorLayStatus}
                          </span>
                        </div>
                        <div className="calculator-segment-grid calculator-segment-grid-lay">
                          <label
                            className={`${getGuidedFieldClass("exchange")}${
                              calculatorUnlocked && missingCalculatorFields.includes("Exchange")
                                ? " is-invalid"
                                : ""
                            }`}
                            {...getGuidedFieldData("exchange")}
                          >
                            <span>Exchange</span>
                            <select
                              aria-describedby={getGuidedDescribedBy("exchange")}
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
                          <label
                            className={`${getGuidedFieldClass("lay_odds_1")}${
                              calculatorUnlocked && missingCalculatorFields.includes("Lay odds 1")
                                ? " is-invalid"
                                : ""
                            }`}
                            {...getGuidedFieldData("lay_odds_1")}
                          >
                            <span>Lay odds 1</span>
                            <input
                              aria-describedby={getGuidedDescribedBy("lay_odds_1")}
                              aria-invalid={calculatorUnlocked && missingCalculatorFields.includes("Lay odds 1")}
                              onChange={(event) =>
                                setFormState((current) => ({ ...current, lay_odds_1: event.target.value }))
                              }
                              value={formState.lay_odds_1}
                            />
                          </label>
                          <label
                            className={`${getGuidedFieldClass("lay_actual")}${
                              calculatorUnlocked && missingCalculatorFields.includes("Lay actual")
                                ? " is-invalid"
                                : ""
                            }`}
                            {...getGuidedFieldData("lay_actual")}
                          >
                            <span>Lay actual</span>
                            <input
                              aria-describedby={getGuidedDescribedBy("lay_actual")}
                              aria-invalid={calculatorUnlocked && missingCalculatorFields.includes("Lay actual")}
                              onChange={(event) =>
                                setFormState((current) => ({ ...current, lay_actual: event.target.value }))
                              }
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
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className={`calculator-band calculator-band-secondary${isNoLayStrategy ? " calculator-band-single" : ""}`}>
                  {!isNoLayStrategy ? (
                    <div className="calculator-panel-card calculator-result-panel">
                      {previewReady && freeBetLaySuggestionCards.length > 0 ? (
                        <div
                          className={`calculator-result-card-grid calculator-result-card-grid-${freeBetCalculatorMode.toLowerCase()}`}
                          data-pd-id="free-bets.matching.result-cards"
                        >
                          {freeBetOutcomeCardFields.map((card) => (
                            <article
                              className={`calculator-result-card calculator-result-card-${card.mode.toLowerCase()}`}
                              key={card.mode}
                            >
                              <div className="calculator-result-card-heading">
                                <strong>{card.mode}</strong>
                              </div>
                              <dl className="calculator-result-card-values">
                                <div>
                                  <dt>Lay Stake</dt>
                                  <dd>{formatPreviewFinancialValue(card.preview?.layStake ?? card.stake)}</dd>
                                </div>
                                <div>
                                  <dt>Liability</dt>
                                  <dd>{formatPreviewFinancialValue(card.preview?.liability)}</dd>
                                </div>
                                <div>
                                  <dt>Back Win</dt>
                                  <dd>{renderPreviewFinancialValue(card.preview?.backWin)}</dd>
                                </div>
                                <div>
                                  <dt>Lay Win</dt>
                                  <dd>{renderPreviewFinancialValue(card.preview?.layWin)}</dd>
                                </div>
                              </dl>
                              {card.mode === "Custom" ? (
                                <div className="custom-slider-card-controls">
                                  <div className="custom-slider-row">
                                    <label className="field-control custom-slider-range-label">
                                      <span>Min</span>
                                      <input
                                        inputMode="decimal"
                                        min="0.01"
                                        onChange={(event) => {
                                          if (isDecimalCalculatorInput(event.target.value)) {
                                            setFreeBetCustomSliderMin(event.target.value);
                                          }
                                        }}
                                        step="0.01"
                                        type="number"
                                        value={
                                          freeBetCustomSliderMin ||
                                          formatPreviewMoney(freeBetCustomSliderEffectiveMin)
                                        }
                                      />
                                    </label>
                                    <div className="custom-slider-track-wrap">
                                      <input
                                        aria-label="Custom free-bet lay stake slider"
                                        aria-valuemax={freeBetCustomSliderBoundedMax}
                                        aria-valuemin={freeBetCustomSliderEffectiveMin}
                                        aria-valuenow={freeBetCustomSliderCurrentFloat}
                                        className="custom-slider-track"
                                        max={freeBetCustomSliderBoundedMax}
                                        min={freeBetCustomSliderEffectiveMin}
                                        onBlur={(event) =>
                                          commitFreeBetCustomSliderValue(event.target.value)
                                        }
                                        onChange={(event) => {
                                          setFreeBetCustomSliderDraftValue(
                                            formatPreviewMoney(Number(event.target.value))
                                          );
                                        }}
                                        onKeyUp={(event) => {
                                          if (
                                            [
                                              "ArrowLeft",
                                              "ArrowRight",
                                              "Home",
                                              "End",
                                              "PageUp",
                                              "PageDown",
                                            ].includes(event.key)
                                          ) {
                                            commitFreeBetCustomSliderValue(event.currentTarget.value);
                                          }
                                        }}
                                        onPointerUp={(event) =>
                                          commitFreeBetCustomSliderValue(event.currentTarget.value)
                                        }
                                        step="0.01"
                                        type="range"
                                        value={freeBetCustomSliderCurrentFloat}
                                      />
                                    </div>
                                    <label className="field-control custom-slider-range-label">
                                      <span>Max</span>
                                      <input
                                        inputMode="decimal"
                                        min="0.01"
                                        onChange={(event) => {
                                          if (isDecimalCalculatorInput(event.target.value)) {
                                            setFreeBetCustomSliderMax(event.target.value);
                                          }
                                        }}
                                        step="0.01"
                                        type="number"
                                        value={
                                          freeBetCustomSliderMax ||
                                          formatPreviewMoney(freeBetCustomSliderBoundedMax)
                                        }
                                      />
                                    </label>
                                  </div>
                                </div>
                              ) : null}
                              <button
                                className="review-chip review-chip-copy calculator-result-copy"
                                disabled={card.stake === "—"}
                                onClick={() =>
                                  card.mode === "Custom"
                                    ? void applyCustomLayValue()
                                    : void applySuggestedLayValue(card.mode)
                                }
                                type="button"
                              >
                                <span aria-hidden="true" className="material-symbols-outlined">
                                  copy_all
                                </span>
                                <span>Copy</span>
                              </button>
                            </article>
                          ))}
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
                  {isNoLayStrategy ? (
                  <div className="calculator-panel-card calculator-result-panel">
                    {previewReady ? (
                      <div className="calculator-result-card-grid calculator-result-card-grid-simple">
                        <article className="calculator-result-card">
                          <div className="calculator-result-card-heading">
                            <strong>Current Scenario</strong>
                          </div>
                          <dl className="calculator-result-card-values">
                            <div>
                              <dt>{activeDisplayedValueLabel}</dt>
                              <dd>{renderPreviewFinancialValue(activeDisplayedNumericValue)}</dd>
                            </div>
                            <div>
                              <dt>{getFreeBetBackLabel(formState.result)}</dt>
                              <dd>
                                {renderPreviewFinancialValue(
                                  activePreviewCalculation?.scenario_pnl_if_back_wins ??
                                    selectedRow?.scenario_pnl_if_back_wins
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt>{getFreeBetLayLabel(formState.result, isNoLayStrategy)}</dt>
                              <dd>
                                {renderPreviewFinancialValue(
                                  activePreviewCalculation?.scenario_pnl_if_lay_wins ??
                                    selectedRow?.scenario_pnl_if_lay_wins
                                )}
                              </dd>
                            </div>
                          </dl>
                        </article>
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
                </div>
              </div>
            </div>
            </fieldset>
          </EditorSection>
          </LedgerEditorTabPanel>
          <LedgerEditorTabPanel activeTabId={safeActiveEditorTabId} tabId="settlement">
          <EditorSection
            collapsible={false}
            headerAside={
              renderEditorSectionAside()
            }
            invalid={
              offerIdentityValidationActive && missingPlacementFields.includes("Settles")
            }
            title="Settlement"
          >
            {offerIdentityValidationActive && missingPlacementFields.includes("Settles") ? (
              <EditorValidationBanner
                dismissKey={`free-bet-settlement:${selectedId ?? formState.free_bet_id ?? "new"}:${missingPlacementFields.join("|")}`}
                id="free-bet.editor.settlement-validation"
                message="Settled or resolved free-bet rows need a settle date."
                title="Settlement incomplete"
              />
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
              <label
                className={getGuidedFieldClass("settles")}
                {...getGuidedFieldData("settles")}
              >
                <span>Settles</span>
                <input
                  aria-describedby={getGuidedDescribedBy("settles")}
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
            collapsible={false}
            title="Result"
          >
            <fieldset className="section-fieldset" disabled={isSettledReadOnly}>
            <div className="form-grid">
              <label
                className={getGuidedFieldClass("result")}
                {...getGuidedFieldData("result")}
              >
                <span>Result</span>
                <select
                  aria-describedby={getGuidedDescribedBy("result")}
                  onChange={(event) =>
                    void applyDropdownChange(
                      (current) => applyResultDefaults(current, event.target.value),
                      "Result change"
                    )
                  }
                  value={resultSelectValue}
                >
                  {resultOptions.map((option) => (
                    <option key={option} value={option}>
                      {getFreeBetResultLabel(option, isNoLayStrategy)}
                    </option>
                  ))}
                </select>
              </label>
              {quickSettlementOptions.length > 0 ? (
                <div
                  aria-label="Free-bet quick settlement outcomes"
                  className="settlement-quick-actions field-span-2"
                  data-pd-id="free-bets.editor.quick-settlement-actions"
                  role="group"
                >
                  {quickSettlementOptions.map((option) => (
                    <button
                      aria-pressed={resultSelectValue === option}
                      className={`review-chip settlement-quick-action${
                        resultSelectValue === option ? " is-active" : ""
                      }`}
                      key={option}
                      onClick={() =>
                        void applyDropdownChange(
                          (current) => applyResultDefaults(current, option),
                          "Settlement quick action"
                        )
                      }
                      type="button"
                    >
                      {getFreeBetResultLabel(option, isNoLayStrategy)}
                    </button>
                  ))}
                </div>
              ) : null}
              <section
                aria-label={
                  formState.result === "Pending"
                    ? "Free-bet possible outcomes"
                    : "Free-bet final outcome"
                }
                className={`settlement-outcome-panel field-span-2${
                  formState.result !== "Pending" || formState.status === "Settled"
                    ? " settlement-outcome-panel-final"
                    : ""
                }`}
                data-pd-id="free-bets.editor.settlement-outcomes"
              >
                <div className="settlement-outcome-primary">
                  <span className="summary-label">{activeDisplayedValueLabel}</span>
                  <strong>{renderPreviewFinancialValue(activeDisplayedNumericValue)}</strong>
                </div>
                {formState.result === "Pending" ? (
                  <div className="settlement-outcome-grid">
                    <article className="settlement-outcome-card">
                      <span className="summary-label">Possible outcome</span>
                      <strong>{getFreeBetBackLabel(formState.result)}</strong>
                      {renderPreviewFinancialValue(
                        activePreviewCalculation?.scenario_pnl_if_back_wins ??
                          selectedRow?.scenario_pnl_if_back_wins
                      )}
                    </article>
                    <article className="settlement-outcome-card">
                      <span className="summary-label">Possible outcome</span>
                      <strong>{getFreeBetLayLabel(formState.result, isNoLayStrategy)}</strong>
                      {renderPreviewFinancialValue(
                        activePreviewCalculation?.scenario_pnl_if_lay_wins ??
                          selectedRow?.scenario_pnl_if_lay_wins
                      )}
                    </article>
                  </div>
                ) : (
                  <div className="settlement-outcome-status">
                    <span className="table-chip table-chip-success">Outcome hit</span>
                    <strong>{getFreeBetResultLabel(formState.result, isNoLayStrategy)}</strong>
                  </div>
                )}
              </section>
            </div>
            </fieldset>
          </EditorSection>
          {selectedRow &&
          (!freeBetTerminalStatuses.has(selectedRow.status) ||
            selectedRow.follow_up_reminder_state === "Active") ? (
            <EditorSection
              collapsible={false}
              headerAside={
                <span
                  className={`table-chip${
                    selectedRow.follow_up_reminder_state === "Active"
                      ? " table-chip-lay-partial"
                      : ""
                  }`}
                >
                  {selectedRow.follow_up_reminder_state}
                </span>
              }
              title="Follow-up"
            >
              <section
                aria-label="Free-bet follow-up reminder"
                className="stack"
                data-pd-id="free-bets.follow-up-reminder.summary"
              >
                {selectedRow.follow_up_reminder_state === "Active" ? (
                  <div className="summary-list">
                    <p className="lede">
                      <span className="summary-label">Due</span>
                      <strong>
                        {formatHumanDisplayDate(
                          selectedRow.follow_up_reminder_due_at,
                          true
                        )}
                      </strong>
                    </p>
                    {selectedRow.follow_up_reminder_reason ? (
                      <p className="lede">
                        <span className="summary-label">Reason</span>
                        <span>{selectedRow.follow_up_reminder_reason}</span>
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div className="tracker-nav">
                  <button
                    aria-label={
                      selectedRow.follow_up_reminder_state === "Active"
                        ? "Review free-bet follow-up reminder"
                        : selectedRow.follow_up_reminder_state === "Not Set"
                          ? "Set free-bet follow-up reminder"
                          : "Set new free-bet follow-up reminder"
                    }
                    className="button-link icon-text-action"
                    data-pd-id="free-bets.follow-up-reminder.open"
                    onClick={() => openFollowUpReminderEditor(selectedRow)}
                    type="button"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined">
                      {selectedRow.follow_up_reminder_state === "Active"
                        ? "notifications_active"
                        : "notification_add"}
                    </span>
                    {selectedRow.follow_up_reminder_state === "Active"
                      ? "Review Reminder"
                      : selectedRow.follow_up_reminder_state === "Not Set"
                        ? "Set Reminder"
                        : "Set New Reminder"}
                  </button>
                </div>
                {followUpReminderEditorState?.rowId === selectedRow.free_bet_id ? (
                  <div
                    aria-label="Free-bet follow-up reminder controls"
                    className="stack partial-lay-reminder-editor"
                    data-pd-id="free-bets.follow-up-reminder.inline-editor"
                  >
                    <div className="form-grid">
                      <label className="field-control">
                        <span>Follow-up due</span>
                        <input
                          data-pd-id="free-bets.follow-up-reminder.due"
                          disabled={isFollowUpReminderSaving}
                          onChange={(event) =>
                            setFollowUpReminderEditorState((current) =>
                              current ? { ...current, due_at: event.target.value } : current
                            )
                          }
                          type="datetime-local"
                          value={followUpReminderEditorState.due_at}
                        />
                      </label>
                      <label className="field-control">
                        <span>Reason (optional)</span>
                        <input
                          data-pd-id="free-bets.follow-up-reminder.reason"
                          disabled={isFollowUpReminderSaving}
                          onChange={(event) =>
                            setFollowUpReminderEditorState((current) =>
                              current ? { ...current, reason: event.target.value } : current
                            )
                          }
                          value={followUpReminderEditorState.reason}
                        />
                      </label>
                      {followUpReminderEditorState.wasActive ? (
                        <label className="field-control field-span-2">
                          <span>Resolution or dismissal note</span>
                          <textarea
                            data-pd-id="free-bets.follow-up-reminder.resolution-note"
                            disabled={isFollowUpReminderSaving}
                            onChange={(event) =>
                              setFollowUpReminderEditorState((current) =>
                                current
                                  ? { ...current, resolution_note: event.target.value }
                                  : current
                              )
                            }
                            rows={3}
                            value={followUpReminderEditorState.resolution_note}
                          />
                        </label>
                      ) : null}
                    </div>
                    <div className="tracker-nav">
                      <button
                        className="button-link"
                        disabled={isFollowUpReminderSaving}
                        onClick={() => setFollowUpReminderEditorState(null)}
                        type="button"
                      >
                        Close
                      </button>
                      {followUpReminderEditorState.wasActive ? (
                        <>
                          <button
                            className="review-chip review-chip-danger tracker-nav-right-action"
                            disabled={
                              isFollowUpReminderSaving ||
                              !followUpReminderEditorState.resolution_note.trim()
                            }
                            onClick={() => void submitFollowUpReminder("Dismissed")}
                            type="button"
                          >
                            Dismiss
                          </button>
                          <button
                            className="modal-primary-button"
                            disabled={
                              isFollowUpReminderSaving ||
                              !followUpReminderEditorState.resolution_note.trim()
                            }
                            onClick={() => void submitFollowUpReminder("Resolved")}
                            type="button"
                          >
                            Resolve
                          </button>
                        </>
                      ) : (
                        <button
                          className="modal-primary-button tracker-nav-right-action"
                          disabled={
                            isFollowUpReminderSaving ||
                            !followUpReminderEditorState.due_at.trim()
                          }
                          onClick={() => void submitFollowUpReminder("Active")}
                          type="button"
                        >
                          {selectedRow.follow_up_reminder_state === "Not Set"
                            ? "Save Reminder"
                            : "Save New Reminder"}
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}
              </section>
            </EditorSection>
          ) : (
            <EditorSection collapsible={false} title="Follow-up">
              <p className="lede">Save the free-bet row before adding a follow-up reminder.</p>
            </EditorSection>
          )}
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
          </LedgerEditorTabPanel>
          <div className="field-span-2 workflow-editor-footer" data-pd-id="free-bets.editor.actions">
            {selectedId && settledDeleteGuardRowId === selectedId ? (
              <LedgerSettledDeleteGuard
                disabled={isPersisting}
                ledgerLabel="free-bets"
                onCancel={() => {
                  setSettledDeleteGuardRowId(null);
                  setSettledDeleteReason("");
                }}
                onConfirm={() =>
                  void handleDeleteSelectedRow(selectedId, {
                    confirmedSettledReason: settledDeleteReason,
                  })
                }
                onReasonChange={setSettledDeleteReason}
                reason={settledDeleteReason}
                rowLabel={selectedId}
              />
            ) : null}
            <div className="tracker-nav workflow-editor-footer-primary">
              {isSettledReadOnly ? (
                <button
                  aria-label="Close free-bet editor"
                  className="review-chip"
                  disabled={isPersisting}
                  onClick={() => void closeEditor()}
                  type="button"
                >
                  Close
                </button>
              ) : (
                <>
                  <button
                    className="review-chip review-chip-copy"
                    disabled={isPending || isPersisting || !isDirty}
                    type="submit"
                  >
                    {isPending || isPersisting ? <span aria-hidden="true" className="button-spinner" /> : null}
                    {isPending || isPersisting ? "Saving" : settledEditEnabled ? "Save Edits" : "Save"}
                  </button>
                  {settledEditEnabled ? (
                    <button
                      className="review-chip"
                      disabled={isPersisting}
                      onClick={handleCancelSettledEdit}
                      type="button"
                    >
                      Cancel
                    </button>
                  ) : null}
                  {selectedId ? (
                    <button
                      className="review-chip review-chip-danger"
                      disabled={isPersisting}
                      onClick={() => void handleDeleteSelectedRow()}
                      type="button"
                    >
                      Delete
                    </button>
                  ) : null}
                  <button className="review-chip" disabled={isPersisting} onClick={handleResetForm} type="button">
                    Revert
                  </button>
                </>
              )}
            </div>
            <div
              aria-label="Free-bet editor footer tab navigation"
              className="tracker-nav workflow-editor-footer-nav"
              data-pd-id="free-bets.editor.footer-tab-actions"
              role="group"
            >
              <button
                className="review-chip review-chip-action-previous"
                disabled={!previousFreeBetEditorTab}
                onClick={() => {
                  if (previousFreeBetEditorTab) {
                    activateFreeBetEditorTab(previousFreeBetEditorTab.id as FreeBetEditorTabId);
                  }
                }}
                type="button"
              >
                Previous
              </button>
              <button
                className="review-chip review-chip-action-next"
                disabled={!nextFreeBetEditorTab}
                onClick={() => {
                  if (nextFreeBetEditorTab) {
                    activateFreeBetEditorTab(nextFreeBetEditorTab.id as FreeBetEditorTabId);
                  }
                }}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </form>
        </div>
      </section>
      </div>
      ) : null}
    </section>
  );
}
