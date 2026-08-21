"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { apiBaseUrl } from "@/lib/api";
import {
  fetchJsonAndCache,
  invalidateCachedJson,
  readCachedJson,
  TRACKER_STALE_WHILE_REFRESH_MS,
} from "@/lib/client-json-cache";
import { dispatchTrackerDataUpdated } from "@/lib/tracker-data-events";
import {
  addOrReplaceLocalFundManagerNotification,
  FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT,
} from "@/lib/notifications";
import { formatFinancialValue } from "@/lib/financial-display";
import {
  getCalculatorModeForLayWorkflowMode,
  getLayWorkflowModeForStrategy,
  getSingleLayResultModes,
  getStrategyForLayWorkflowMode,
  isDecimalCalculatorInput,
  sportsbookLayWorkflowModeOptions,
  type LayWorkflowMode,
  type SingleLayResultMode,
} from "@/lib/ledger-calculator";
import {
  getSportsbookGuidedEntry,
  type GuidedEntryFieldKey,
} from "@/lib/guided-entry-focus";
import { getAccountNamesByType, type AccountAuthorityRecord } from "@/lib/account-authorities";
import { StatusToast } from "@/components/status-toast";
import { BookmakerIdentity, useBookmakerCatalogue } from "@/components/bookmaker-identity";
import { EditorSection } from "@/components/editor-section";
import { EditorValidationBanner } from "@/components/editor-validation-banner";
import { FinancialValue } from "@/components/financial-value";
import { LedgerEditorTabPanel, LedgerEditorTabRail } from "@/components/ledger-editor-tabs";
import { LedgerValueCell } from "@/components/ledger-value-cell";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { LedgerAddRowButton } from "@/components/ledger-add-row-button";
import { LedgerSettledDeleteGuard } from "@/components/ledger-settled-delete-guard";
import { TrackerRangeCard } from "@/components/tracker-range-card";
import { MultiProfileSportsbookCopyDialog } from "@/components/multi-profile-sportsbook-copy-dialog";
import { FeeReviewResolutionBanner } from "@/components/fee-review-resolution-banner";
import { refreshFeeReviewResolutionSession, type FeeReviewResolutionContext } from "@/lib/fee-review-session";
import { getSettlementValidationMessage } from "@/lib/settlement-validation";
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
import { getSettlementTabAttentionState, type LedgerEditorTabDefinition } from "@/lib/ledger-editor-tabs";
import {
  getSpecialOfferBookmakerSuggestion,
  resolveKnownBookmakerCoverage,
} from "@/lib/sportsbook-offer-knowledge";
import {
  applyPlacementActionToState,
  filterPlacedPendingRowsInDateRange,
  getFinalizedLaySelectionFromPartialLegs,
  getSportsbookBackBetStatusBadge,
  getSportsbookIssueBadges,
  getPartialLayExecutionSummary,
  getPartialLayReminderDefaultDueAt,
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
import { saveTrackerDatePreset } from "@/lib/tracker-settings-client";
import {
  formatResolvedDateRange,
  formatResolvedDateRangeContext,
  resolveDateRange,
  type DatePreset,
} from "@/lib/tracker-summary";
import {
  filterTrackerRows,
  getTrackerPageCount,
  paginateTrackerRows,
} from "@/lib/tracker-table";
import type { TrackerRow } from "@/lib/tracker-types";
import { confirmDestructiveAction, useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { sortIssueBadgesByPriority } from "@/lib/issue-priority";
import {
  dedupeOptions,
  filterCampaignTagOptions,
  fixtureTypeOptions,
  freeBetRetentionModeOptions,
  freeBetStatusOptions,
  getAllowedBetTypesForOfferType,
  getDefaultBetTypeForOfferType,
  getOfferTypeOptions,
  normalizeSportsbookBetType,
  sportsbookStatusOptions,
} from "@/lib/workbook-options";

const validSportsbookStrategyValues = new Set([
  "Standard",
  "Underlay",
  "Overlay",
  "Custom",
  "No Lay",
  "Partial Lay",
  "Multilay",
  "Multilay-Underlay",
]);
const commonFixtureQuickPicks = ["Football", "Horse Racing", "Golf", "Tennis"];
const guidedFieldTabMap: Record<GuidedEntryFieldKey, SportsbookEditorTabId> = {
  offer: "setup",
  bookmaker: "setup",
  bet_type: "setup",
  offer_type: "setup",
  offer_name: "setup",
  fixture_type: "setup",
  event_name: "setup",
  back_stake: "matching",
  back_odds: "matching",
  exchange: "matching",
  lay_odds_1: "matching",
  lay_actual: "matching",
  multi_lay_outcomes: "matching",
  multi_lay_placements: "matching",
  settlement: "settlement",
  free_bet_bridge: "free_bet",
};

const guidedTabLabels: Record<SportsbookEditorTabId, string> = {
  setup: "Bet Setup",
  matching: "Matching",
  placement: "Placement",
  settlement: "Settlement",
  free_bet: "Free Bet",
};

const guidedFieldFallbackMessages: Record<GuidedEntryFieldKey, string> = {
  offer: "Add The Offer Name As Shown.",
  bookmaker: "Choose The Bookmaker.",
  bet_type: "Choose The Bet Type.",
  offer_type: "Choose The Offer Type.",
  offer_name: "Choose Or Enter The Offer Name.",
  fixture_type: "Choose The Fixture Type.",
  event_name: "Enter The Event Name.",
  back_stake: "Enter The Back Stake.",
  back_odds: "Enter The Back Odds.",
  exchange: "Choose The Exchange.",
  lay_odds_1: "Enter The Lay Odds.",
  lay_actual: "Confirm The Lay Actual.",
  multi_lay_outcomes: "Complete The Multi-Lay Outcome Names And Odds.",
  multi_lay_placements: "Copy Or Confirm Each Multi-Lay Branch Placement.",
  settlement: "Confirm The Settlement Date And Outcome.",
  free_bet_bridge: "Create The Free Bet.",
};

function isBonusLockInOfferType(value: string): boolean {
  return value === "Bonus Lock-In" || value === "Refund";
}

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
  profit_boost_mode: string;
  base_back_odds: string;
  profit_boost_percent: string;
  maximum_boost_winnings: string;
  actual_accepted_back_odds: string;
  source_combo_preset_id: string;
  source_combo_preset_version: number;
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
  partial_lay_reminder_state: string;
  partial_lay_reminder_due_at: string;
  partial_lay_reminder_reason: string;
  partial_lay_reminder_resolution_note: string;
  partial_lay_reminder_resolved_at: string;
  partial_lay_reminder_resolved_by: string;
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
  reference_boosted_odds: string | null;
  effective_back_odds: string | null;
  profit_boost_source: string | null;
};

type LinkedFreeBetRecord = {
  free_bet_id: string;
  event_name: string;
  offer_text: string;
  bookmaker: string;
  status: string;
  result: string;
  free_bet_value: string;
  expiry_datetime: string;
  origin_qual_bet_id: string;
  source_award_split_index: number;
  source_award_split_total: number;
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
  profit_boost_mode: string;
  base_back_odds: string;
  profit_boost_percent: string;
  maximum_boost_winnings: string;
  actual_accepted_back_odds: string;
  source_combo_preset_id: string;
  source_combo_preset_version: number;
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

type SportsbookEditorTabId = "setup" | "matching" | "placement" | "settlement" | "free_bet";

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
  default_exchange_name?: string;
};

type CommonBetCombo = {
  preset_id: string;
  name: string;
  bookmaker: string;
  bookmakers: string[];
  offer_type: string;
  bet_type: string;
  offer_name: string;
  fixture_type: string;
  default_back_stake: string;
  minimum_back_odds: string;
  default_strategy: string;
  allowed_strategies: string[];
  version: number;
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
  exchangeName: string;
  commissionRate: string;
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

type ExchangeCommissionLookup = Record<string, string>;

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
  reference_boosted_odds: string | null;
  effective_back_odds: string | null;
  profit_boost_source: string | null;
};

type OutcomeModalState = {
  rowId: string;
  status: string;
  result: string;
  date_settled: string;
};

type PartialLayReminderEditorState = {
  rowId: string;
  due_at: string;
  reason: string;
  resolution_note: string;
  wasActive: boolean;
};

type FreeBetBridgeSplitState = {
  split_id: string;
  free_bet_value: string;
  offer_name: string;
  bet_type: string;
  fixture_type: string;
  expiry_datetime: string;
  retention_mode: string;
  user_notes: string;
};

type FreeBetBridgeModalState = {
  sourceRowId: string;
  bookmaker: string;
  offer_type: string;
  offer_name: string;
  bet_type: string;
  fixture_type: string;
  free_bet_status: string;
  free_bet_value: string;
  expiry_datetime: string;
  retention_mode: string;
  expected_award_value: string;
  variance_reason: string;
  user_notes: string;
  splits: FreeBetBridgeSplitState[];
};

type SportsbookTableMode =
  | "recent"
  | "settling-soon"
  | "pending-placed"
  | "prospecting"
  | "underlays"
  | "overlays";

type SportsbookIssueFilter =
  | "any"
  | "all-issues"
  | "back-unplaced"
  | "no-settle-date"
  | "outcome-needed"
  | "lay-recheck";

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
  actions: 190,
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
  return formatFinancialValue(value);
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

  if (issueType === "all-issues") {
    return issueLabels.size > 0;
  }

  if (issueType === "back-unplaced") {
    return issueLabels.has("Back Unplaced");
  }

  if (issueType === "no-settle-date") {
    return issueLabels.has("No Settle Date");
  }

  if (issueType === "outcome-needed") {
    return issueLabels.has("Outcome Needed");
  }

  if (issueType === "lay-recheck") {
    return issueLabels.has("Lay Recheck") || issueLabels.has("Lay Recheck Overdue");
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
    profit_boost_mode: "displayed_odds",
    base_back_odds: "",
    profit_boost_percent: "",
    maximum_boost_winnings: "",
    actual_accepted_back_odds: "",
    source_combo_preset_id: "",
    source_combo_preset_version: 0,
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
    profit_boost_mode: record.profit_boost_mode || "displayed_odds",
    base_back_odds: record.base_back_odds,
    profit_boost_percent: record.profit_boost_percent,
    maximum_boost_winnings: record.maximum_boost_winnings,
    actual_accepted_back_odds: record.actual_accepted_back_odds,
    source_combo_preset_id: record.source_combo_preset_id || "",
    source_combo_preset_version: record.source_combo_preset_version || 0,
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
        ? parseCurrencyLikeValue(value)
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

function renderNeutralPreviewFinancialValue(value: number | string | null | undefined) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? parseCurrencyLikeValue(value)
        : null;
  return parsed === null ? (
    <span className="projected-outcome-financial-value financial-value financial-value-neutral">
      £ -
    </span>
  ) : (
    <span className="projected-outcome-financial-value financial-value financial-value-neutral">
      {formatFinancialValue(parsed)}
    </span>
  );
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
    profit_boost_mode: formState.profit_boost_mode,
    base_back_odds: formState.base_back_odds,
    profit_boost_percent: formState.profit_boost_percent,
    maximum_boost_winnings: formState.maximum_boost_winnings,
    actual_accepted_back_odds: formState.actual_accepted_back_odds,
    source_combo_preset_id: formState.source_combo_preset_id,
    source_combo_preset_version: formState.source_combo_preset_version,
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

function createFreeBetBridgeSplit(options: {
  value: string;
  offerName: string;
  betType: string;
  fixtureType: string;
  expiry: string;
  retentionMode: string;
  index?: number;
}): FreeBetBridgeSplitState {
  return {
    split_id: `split-${Date.now()}-${options.index ?? 1}`,
    free_bet_value: options.value,
    offer_name: options.offerName,
    bet_type: options.betType,
    fixture_type: options.fixtureType,
    expiry_datetime: options.expiry,
    retention_mode: options.retentionMode,
    user_notes: "",
  };
}

function createClearedFreeBetBridgeSplit(index = 1): FreeBetBridgeSplitState {
  return createFreeBetBridgeSplit({
    value: "",
    offerName: "",
    betType: "",
    fixtureType: "",
    expiry: "",
    retentionMode: "SNR",
    index,
  });
}

function getFreeBetBridgeSplitTotal(splits: FreeBetBridgeSplitState[]): number {
  return splits.reduce((total, split) => {
    const parsedValue = parseNumericInput(split.free_bet_value);
    return total + (parsedValue ?? 0);
  }, 0);
}

function hasFreeBetBridgeVariance(state: FreeBetBridgeModalState): boolean {
  const expected = parseNumericInput(state.expected_award_value);
  if (expected === null) {
    return false;
  }
  return Math.abs(getFreeBetBridgeSplitTotal(state.splits) - expected) > 0.009;
}

function getFreeBetBridgeValidationMessage(state: FreeBetBridgeModalState): string {
  if (state.splits.length === 0) {
    return "Add at least one free-bet award row.";
  }

  const invalidSplit = state.splits.find((split) => {
    const value = parseNumericInput(split.free_bet_value);
    return value === null || value <= 0 || !split.offer_name.trim() || !split.bet_type.trim() || !split.fixture_type.trim();
  });

  if (invalidSplit) {
    return "Each split needs a positive value, campaign tag, bet type, and fixture type.";
  }

  if (!state.free_bet_status.trim()) {
    return "Choose the free-bet status.";
  }

  if (hasFreeBetBridgeVariance(state) && !state.variance_reason.trim()) {
    return "Explain why the split total differs from the expected award value.";
  }

  return "";
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

function parsePartialLayLegs(
  serialized: string,
  fallback?: {
    exchangeName: string;
    layOdds: string;
    matchedStake: string;
  }
): PartialLayLegInput[] {
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

    if (legs.length > 0) return legs;
  } catch {
    // Legacy rows can still be represented by the primary matched-stake columns.
  }

  if (fallback && (parseNumericInput(fallback.matchedStake) ?? 0) > 0) {
    return [
      {
        id: createPartialLayLegId(1),
        exchangeName: fallback.exchangeName,
        layOdds: fallback.layOdds,
        matchedStake: fallback.matchedStake,
        isFinal: false,
      },
    ];
  }

  return [];
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

  if (offerType === "Cashback" || isBonusLockInOfferType(offerType)) {
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

  return ["Pending", "Back Won", "Lay Won", "Void"].map((option) => ({
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

  if (offerType === "Cashback" || isBonusLockInOfferType(offerType)) {
    const triggerPossible =
      isBonusLockInOfferType(offerType) ? "Bonus/refund trigger hits" : "Cashback trigger hits";
    const triggerSettled =
      isBonusLockInOfferType(offerType) ? "Bonus/refund triggered" : "Cashback triggered";
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

  if (nextOfferType === "Cashback" || isBonusLockInOfferType(nextOfferType)) {
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
  const hasProfitBoostInputs =
    formState.offer_type === "Profit Boost" && formState.profit_boost_mode === "percentage"
      ? parseNumericInput(formState.base_back_odds) !== null &&
        parseNumericInput(formState.profit_boost_percent) !== null
      : parseNumericInput(formState.back_odds) !== null;
  const hasBackInputs =
    parseNumericInput(formState.back_stake) !== null && hasProfitBoostInputs;

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
  if (formState.offer_type === "Profit Boost" && formState.profit_boost_mode === "percentage") {
    if (parseNumericInput(formState.base_back_odds) === null) {
      missing.push("Base back odds");
    }
    if (parseNumericInput(formState.profit_boost_percent) === null) {
      missing.push("Profit boost %");
    }
  } else if (parseNumericInput(formState.back_odds) === null) {
    missing.push(formState.offer_type === "Profit Boost" ? "Boosted back odds" : "Back odds");
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
    (formState.offer_type === "Cashback" || isBonusLockInOfferType(formState.offer_type)) &&
    parseNumericInput(formState.maximum_bonus) === null
  ) {
    missing.push("Maximum bonus");
  }

  if (
    isBonusLockInOfferType(formState.offer_type) &&
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
  extraOutcomes: MultiLayOutcomeInput[],
  primaryPlacement: MultiLayPrimaryPlacementState,
  exchangeCommissionLookup: ExchangeCommissionLookup
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

  if (backStake === null || backOdds === null || layOdds1 === null) {
    return null;
  }

  const resolveBranchCommission = (exchangeName: string) => {
    const exchangeCommission = exchangeName
      ? exchangeCommissionLookup[exchangeName] ?? resolvedCommission
      : resolvedCommission;
    return parseNumericInput(exchangeCommission);
  };

  const activeOdds = [
    {
      key: "outcome1",
      label: outcome1Label.trim() || "Outcome 1",
      exchangeName: primaryPlacement.placedExchange || formState.exchange_name,
      layOdds: layOdds1,
    },
    ...extraOutcomes
      .map((outcome) => ({
        key: outcome.id,
        label: outcome.label.trim() || outcome.id.replace("outcome", "Outcome "),
        exchangeName: outcome.placedExchange || formState.exchange_name,
        layOdds: parseNumericInput(outcome.layOdds),
      }))
      .filter((outcome) => outcome.layOdds !== null)
      .map((outcome) => ({
        key: outcome.key,
        label: outcome.label,
        exchangeName: outcome.exchangeName,
        layOdds: outcome.layOdds as number,
      })),
  ].map((outcome) => ({
    ...outcome,
    commission: resolveBranchCommission(outcome.exchangeName),
  }));

  if (activeOdds.length < 2) {
    return null;
  }

  if (activeOdds.some((outcome) => outcome.commission === null)) {
    return null;
  }

  const standardStakes = activeOdds.map((outcome) => {
    const commission = Number(outcome.commission);
    const denominator = outcome.layOdds - commission;
    if (denominator === 0) {
      return null;
    }
    return (backStake * backOdds) / denominator;
  });

  const underlayDenominator = activeOdds.reduce((sum, outcome) => {
    const commission = Number(outcome.commission);
    const branchDenominator = outcome.layOdds - commission;
    if (branchDenominator === 0) {
      return Number.NaN;
    }
    return sum + (1 - commission) / branchDenominator;
  }, 0);
  const underlayStakes =
    Number.isFinite(underlayDenominator) && underlayDenominator !== 0
      ? activeOdds.map((outcome) => {
          const commission = Number(outcome.commission);
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
    const commission = Number(outcome.commission);
    const liability = selectedStake * (outcome.layOdds - 1);
    const layReturnsAfterCommission = selectedStake * (1 - commission);

    return {
      key: outcome.key,
      label: outcome.label,
      exchangeName: outcome.exchangeName,
      commissionRate: formatPreviewMoney(commission),
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

  const matchedRows = rows.filter((row) => parseNumericInput(row.placedMatchedStake) !== null);

  if (matchedRows.length === 0) {
    return "Not Laid";
  }

  const fullyMatchedRows = rows.filter((row) => {
    const matchedStake = parseNumericInput(row.placedMatchedStake);
    const targetStake = parseNumericInput(row.effectiveStake);
    return (
      row.placementState === "placed" &&
      matchedStake !== null &&
      targetStake !== null &&
      matchedStake >= targetStake - 0.005
    );
  });

  return fullyMatchedRows.length === rows.length ? "Fully Laid" : "Part Laid";
}

function hasActualMultiLayPartialMatch(rows: MultiLayPlacementRow[]): boolean {
  return rows.some((row) => {
    const matchedStake = parseNumericInput(row.placedMatchedStake);
    const targetStake = parseNumericInput(row.effectiveStake);

    return (
      row.placementState === "placed" &&
      matchedStake !== null &&
      targetStake !== null &&
      matchedStake < targetStake - 0.005
    );
  });
}

function canRemoveLinkedFreeBet(row: Pick<LinkedFreeBetRecord, "status" | "result">): boolean {
  return (
    row.result === "Pending" &&
    ["Prospecting", "Available", "Not Yet Awarded"].includes(row.status)
  );
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
    exchangeCommissionLookup: ExchangeCommissionLookup;
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
    options.extraOutcomes,
    options.primaryPlacement,
    options.exchangeCommissionLookup
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

export function SportsbookWorkflowShell({ profileId, initialQuery = "", initialIssueFilter, initialRecordId, feeReviewContext }: { profileId: string; initialQuery?: string; initialIssueFilter?: string; initialRecordId?: string; feeReviewContext?: FeeReviewResolutionContext }) {
  const { catalogue: bookmakerCatalogue, displaySettings: bookmakerDisplaySettings } =
    useBookmakerCatalogue(profileId);
  const [guidedAccessMode] = useProfileGuidedAccessMode(profileId);
  const guidedAccessEnabled = isGuidedAccessEnabled(guidedAccessMode);
  const [rows, setRows] = useState<SportsbookRecord[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [accountAuthorities, setAccountAuthorities] = useState<AccountAuthorityRecord[]>([]);
  const [exchangeSettings, setExchangeSettings] = useState<ExchangeCommissionRecord[]>([]);
  const [trackerSettings, setTrackerSettings] = useState<TrackerSettingsRecord | null>(null);
  const [isTrackerRangeSaving, setIsTrackerRangeSaving] = useState(false);
  const [lookupValues, setLookupValues] = useState<LookupValueRecord[]>([]);
  const [commonBetCombos, setCommonBetCombos] = useState<CommonBetCombo[]>([]);
  const [comboBookmakerCandidates, setComboBookmakerCandidates] = useState<string[]>([]);
  const [comboCoveragePreference, setComboCoveragePreference] = useState<{
    expanded: boolean;
    key: string;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workflowVisible, setWorkflowVisible] = useState(false);
  const [activeEditorTabId, setActiveEditorTabId] =
    useState<SportsbookEditorTabId>("setup");
  const [guidedEntryDismissed, setGuidedEntryDismissed] = useState(false);
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
    "recent",
    Boolean(initialIssueFilter)
  );
  const [tableSort, setTableSort] = useState<SportsbookTableSort | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [tableFilters, setTableFilters] = usePersistedState<SportsbookTableFilterState>(
    `openforge-ledger-table-filters:${profileId}:sportsbook-bets`,
    {
      ...emptyTableFilters,
      issue_type:
        initialIssueFilter === "outcome-needed"
          ? "outcome-needed"
          : initialIssueFilter === "lay-recheck"
            ? "lay-recheck"
            : initialIssueFilter === "all-issues"
              ? "all-issues"
              : "any",
    },
    Boolean(initialIssueFilter)
  );
  useEffect(() => {
    const supported = new Set<SportsbookIssueFilter>([
      "all-issues",
      "back-unplaced",
      "no-settle-date",
      "outcome-needed",
      "lay-recheck",
    ]);
    if (initialIssueFilter && supported.has(initialIssueFilter as SportsbookIssueFilter)) {
      setTableFilters((current) => ({
        ...current,
        issue_type: initialIssueFilter as SportsbookIssueFilter,
      }));
    }
  }, [initialIssueFilter, setTableFilters]);
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
  const [partialMultiLayBranches, setPartialMultiLayBranches] = useState<Set<string>>(
    () => new Set()
  );
  const [partialLayLegs, setPartialLayLegs] = useState<PartialLayLegInput[]>([]);
  const [footballSettlesAssistUsed, setFootballSettlesAssistUsed] = useState(false);
  const [footballSettlesOriginalValue, setFootballSettlesOriginalValue] = useState<string | null>(
    null
  );
  const [pendingLegRemovalId, setPendingLegRemovalId] = useState<string | null>(null);
  const [pendingBackPlacementRevert, setPendingBackPlacementRevert] = useState(false);
  const [pendingLayPlacementRevert, setPendingLayPlacementRevert] = useState(false);
  const [selectedLayWorkflowMode, setSelectedLayWorkflowMode] =
    useState<LayWorkflowMode>("Standard");
  const [calculatorCopyFeedback, setCalculatorCopyFeedback] = useState("");
  const [customSliderMin, setCustomSliderMin] = useState("");
  const [customSliderMax, setCustomSliderMax] = useState("");
  const [customSliderDraftValue, setCustomSliderDraftValue] = useState("");
  const [lastRemovedPartialLayLeg, setLastRemovedPartialLayLeg] = useState<{
    leg: PartialLayLegInput;
    index: number;
  } | null>(null);
  const [multiLayOutcome1Label, setMultiLayOutcome1Label] = useState("");
  const [settledEditEnabled, setSettledEditEnabled] = useState(false);
  const [settledDeleteGuardRowId, setSettledDeleteGuardRowId] = useState<string | null>(null);
  const [settledDeleteReason, setSettledDeleteReason] = useState("");
  const [revertSnapshot, setRevertSnapshot] = useState<SportsbookFormState | null>(null);
  const [outcomeModalState, setOutcomeModalState] = useState<OutcomeModalState | null>(null);
  const [partialLayReminderEditorState, setPartialLayReminderEditorState] =
    useState<PartialLayReminderEditorState | null>(null);
  const [isPartialLayReminderSaving, setIsPartialLayReminderSaving] = useState(false);
  const [isPersisting, setIsPersisting] = useState(false);
  const [freeBetBridgeModalState, setFreeBetBridgeModalState] = useState<FreeBetBridgeModalState | null>(
    null
  );
  const [isFreeBetBridgeSubmitting, setIsFreeBetBridgeSubmitting] = useState(false);
  const [freeBetBridgeSplitsExpanded, setFreeBetBridgeSplitsExpanded] = useState(false);
  const [freeBetBridgeCreatedCount, setFreeBetBridgeCreatedCount] = useState(0);
  const [linkedFreeBetRows, setLinkedFreeBetRows] = useState<LinkedFreeBetRecord[]>([]);
  const [isLinkedFreeBetsLoading, setIsLinkedFreeBetsLoading] = useState(false);
  const [linkedFreeBetRemovalId, setLinkedFreeBetRemovalId] = useState<string | null>(null);
  const [isLinkedFreeBetRemoving, setIsLinkedFreeBetRemoving] = useState(false);
  const [multiProfileCopySource, setMultiProfileCopySource] = useState<SportsbookRecord | null>(null);
  const editorRef = useRef<HTMLElement | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const ignoreInitialRecordIdRef = useRef(false);
  const loadRowsRequestIdRef = useRef(0);
  const isCreatingDraftRef = useRef(false);
  const isPersistingRef = useRef(false);
  const pageSize = 8;
  const defaultBonusRetentionRate = useMemo(
    () =>
      normalizeBonusRetentionPercentForUi(
        trackerSettings?.default_bonus_retention_percent,
        "70"
      ),
    [trackerSettings]
  );
  const defaultBonusRetentionRateRef = useRef(defaultBonusRetentionRate);

  useEffect(() => {
    defaultBonusRetentionRateRef.current = defaultBonusRetentionRate;
  }, [defaultBonusRetentionRate]);

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
        parsePartialLayLegs(pristineFormState.multi_lay_outcomes_json, {
          exchangeName: pristineFormState.exchange_name,
          layOdds: pristineFormState.lay_odds_1,
          matchedStake: pristineFormState.lay_matched_stake_1,
        }),
        parsedMultiLay.primaryPlacement
      );
    },
    [pristineFormState]
  );
  const isDirty = useMemo(
    () => JSON.stringify(currentDirtyState) !== JSON.stringify(pristineDirtyState),
    [currentDirtyState, pristineDirtyState]
  );
  const confirmDiscardChanges = useUnsavedChangesGuard(workflowVisible && isDirty);
  const clearStatusMessage = useCallback(() => setStatusMessage(""), []);
  const tableColumns = useMemo(
    () =>
      sportsbookTableColumns.filter((column) =>
        visibleColumnKeys.has(column.key as SportsbookColumnKey)
      ),
    [visibleColumnKeys]
  );

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

  const loadRows = useCallback(
    async (preferredSelection?: string | null) => {
      const requestId = ++loadRowsRequestIdRef.current;
      const url = `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`;
      const cachedRows = readCachedJson<SportsbookRecord[]>(
        url,
        TRACKER_STALE_WHILE_REFRESH_MS
      );
      if (cachedRows && requestId === loadRowsRequestIdRef.current) {
        setRows(cachedRows);
        setIsInitialLoading(false);
      }

      const nextRows = await fetchJsonAndCache<SportsbookRecord[]>(url);
      if (requestId !== loadRowsRequestIdRef.current) {
        return;
      }
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
          setPartialLayLegs(
            parsePartialLayLegs(activeRecord.multi_lay_outcomes_json, {
              exchangeName: activeRecord.exchange_name,
              layOdds: activeRecord.lay_odds_1,
              matchedStake: activeRecord.lay_matched_stake_1,
            })
          );
          setSelectedLayWorkflowMode(getLayWorkflowModeForStrategy(nextFormState.match_strategy));
          setFormState(nextFormState);
          setPristineFormState(nextFormState);
          setShowBetSetupValidation(false);
          setActiveEditorTabId("setup");
          setGuidedEntryDismissed(false);
          setSettledEditEnabled(false);
          setRevertSnapshot(null);
          setFootballSettlesAssistUsed(false);
          setFootballSettlesOriginalValue(null);
        }
        setWorkflowVisible(true);
      } else {
        if (isCreatingDraftRef.current) {
          setWorkflowVisible(true);
          return;
        }
        const blankForm = createBlankForm(defaultBonusRetentionRateRef.current);
        setMultiLayOutcomes(createDefaultMultiLayOutcomes());
        setMultiLayPrimaryPlacement(createDefaultMultiLayPrimaryPlacementState());
        setPartialLayLegs([]);
        setMultiLayOutcome1Label("");
        setSelectedLayWorkflowMode(getLayWorkflowModeForStrategy(blankForm.match_strategy));
        setFormState(blankForm);
        setPristineFormState(blankForm);
        setShowBetSetupValidation(false);
        setActiveEditorTabId("setup");
        setGuidedEntryDismissed(false);
        setSettledEditEnabled(false);
        setRevertSnapshot(null);
        setFootballSettlesAssistUsed(false);
        setFootballSettlesOriginalValue(null);
        setWorkflowVisible(false);
        setFreeBetBridgeCreatedCount(0);
        setLinkedFreeBetRows([]);
        setLinkedFreeBetRemovalId(null);
      }
    },
    [profileId]
  );

  const loadLinkedFreeBets = useCallback(
    async (sourceRowId: string) => {
      const url = `${apiBaseUrl}/profiles/${profileId}/free-bets`;
      setIsLinkedFreeBetsLoading(true);
      setLinkedFreeBetRemovalId(null);
      try {
        const cachedRows = readCachedJson<LinkedFreeBetRecord[]>(
          url,
          TRACKER_STALE_WHILE_REFRESH_MS
        );
        if (cachedRows) {
          setLinkedFreeBetRows(
            cachedRows.filter((row) => row.origin_qual_bet_id === sourceRowId)
          );
        }

        const rowsFromApi = await fetchJsonAndCache<LinkedFreeBetRecord[]>(url);
        setLinkedFreeBetRows(
          rowsFromApi.filter((row) => row.origin_qual_bet_id === sourceRowId)
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load linked free-bet rows for this sportsbook row."
        );
      } finally {
        setIsLinkedFreeBetsLoading(false);
      }
    },
    [profileId]
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

  const loadCommonBetCombos = useCallback(async () => {
    const response = await fetch(`${apiBaseUrl}/fund-manager/common-bet-combos?active_only=true`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Unable to load common bet combos");
    }
    setCommonBetCombos((await response.json()) as CommonBetCombo[]);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void Promise.all([
        loadRows(ignoreInitialRecordIdRef.current ? undefined : initialRecordId),
        loadExchangeSettings(),
        loadAccountAuthorities(),
        loadLookupValues(),
        loadTrackerSettings(),
        loadCommonBetCombos(),
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
    initialRecordId,
    loadLookupValues,
    loadCommonBetCombos,
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

  const updateTrackerDatePreset = useCallback(
    async (preset: DatePreset) => {
      if (!trackerSettings || trackerSettings.active_date_preset === preset) return;
      setIsTrackerRangeSaving(true);
      setErrorMessage("");
      try {
        const savedSettings = await saveTrackerDatePreset(profileId, trackerSettings, preset);
        setTrackerSettings({
          ...savedSettings,
          default_bonus_retention_percent: normalizeBonusRetentionPercentForUi(
            savedSettings.default_bonus_retention_percent
          ),
        });
        setStatusMessage(`Tracker range set to ${preset}.`);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to save tracker range.");
      } finally {
        setIsTrackerRangeSaving(false);
      }
    },
    [profileId, trackerSettings]
  );

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

  function applyCommonBetCombo(presetId: string) {
    if (formState.sportsbook_bet_id || selectedId) {
      setErrorMessage("Common combos can only be applied to a new sportsbook draft.");
      return;
    }
    if (!presetId) {
      setComboBookmakerCandidates([]);
      setFormState((current) => ({
        ...current,
        source_combo_preset_id: "",
        source_combo_preset_version: 0,
      }));
      return;
    }

    const combo = commonBetCombos.find((row) => row.preset_id === presetId);
    if (!combo) {
      setErrorMessage("That common combo is no longer available. Refresh and try again.");
      return;
    }

    const staleMappings = [
      combo.offer_type && !getOfferTypeOptions("").includes(combo.offer_type) ? "offer type" : "",
      combo.bet_type &&
      !getAllowedBetTypesForOfferType(combo.offer_type, combo.bet_type).includes(combo.bet_type)
        ? "bet type"
        : "",
      combo.fixture_type && !fixtureTypeOptionsResolved.includes(combo.fixture_type)
        ? "fixture type"
        : "",
    ].filter(Boolean);
    if (staleMappings.length > 0) {
      setErrorMessage(
        `${combo.name} needs remapping in Fund Manager Settings: ${staleMappings.join(", ")}.`
      );
      return;
    }

    const knownBookmakers = combo.bookmakers?.length
      ? combo.bookmakers
      : combo.bookmaker
        ? [combo.bookmaker]
        : [];
    const coverage = resolveKnownBookmakerCoverage({
      knownBookmakers,
      accountAuthorities,
      offerType: combo.offer_type,
    });
    const eligibleBookmakers = coverage.filter((row) => row.selectable).map((row) => row.bookmaker);
    if (knownBookmakers.length > 0 && eligibleBookmakers.length === 0) {
      setComboBookmakerCandidates([]);
      const allMissing = coverage.every((row) => row.state === "not_signed_up");
      setErrorMessage(
        allMissing
          ? `No known bookmakers for ${combo.name} are signed up on this profile.`
          : `All known bookmakers for ${combo.name} are unavailable on this profile.`
      );
      return;
    }
    setComboBookmakerCandidates(eligibleBookmakers);
    const selectedBookmaker = eligibleBookmakers.length === 1
      ? eligibleBookmakers[0]
      : eligibleBookmakers.some(
          (bookmaker) => bookmaker.toLowerCase() === formState.bookmaker.toLowerCase()
        )
        ? formState.bookmaker
        : "";

    const preferredStrategy = validSportsbookStrategyValues.has(combo.default_strategy ?? "")
      ? combo.default_strategy
      : "";
    if (preferredStrategy) {
      setSelectedLayWorkflowMode(getLayWorkflowModeForStrategy(preferredStrategy));
    }
    setErrorMessage("");
    setFormState((current) => ({
      ...current,
      source_combo_preset_id: combo.preset_id,
      source_combo_preset_version: combo.version,
      bookmaker: selectedBookmaker || (knownBookmakers.length ? "" : current.bookmaker),
      offer_type: combo.offer_type || current.offer_type,
      bet_type: combo.bet_type || current.bet_type,
      offer_name: combo.offer_name || current.offer_name,
      fixture_type: combo.fixture_type || current.fixture_type,
      back_stake: combo.default_back_stake || current.back_stake,
      match_strategy: preferredStrategy || current.match_strategy,
    }));
    const minimumOddsNote = combo.minimum_back_odds
      ? ` Minimum back odds: ${combo.minimum_back_odds}.`
      : "";
    const profileAccount = selectedBookmaker
      ? accountAuthorities.find(
          (account) =>
            account.type === "Bookie" &&
            account.account.trim().toLowerCase() === selectedBookmaker.trim().toLowerCase()
        )
      : null;
    const restrictionWarning =
      profileAccount?.status === "Limited" ||
      profileAccount?.status === "Soft Limited" ||
      profileAccount?.lifecycle_status === "Soft Limited" ||
      (profileAccount?.restrictions_json || "").includes("Soft Limited")
        ? ` ${selectedBookmaker} is soft limited; verify the accepted stake.`
        : "";
    const bookmakerNote = eligibleBookmakers.length > 1
      ? ` Choose one of ${eligibleBookmakers.length} eligible bookmakers.`
      : "";
    setStatusMessage(
      `${combo.name} applied to this unsaved draft.${bookmakerNote}${minimumOddsNote}${restrictionWarning}`
    );
  }

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

  const freeBetBridgeOfferNameOptions = useMemo(
    () =>
      freeBetBridgeModalState
        ? filterCampaignTagOptions(
            dedupeOptions([
              freeBetBridgeModalState.offer_name,
              ...getLookupValuesByType(lookupValues, "offer_name"),
              ...rows
                .filter((row) => row.offer_type === freeBetBridgeModalState.offer_type)
                .map((row) => row.offer_name),
            ]),
            {
              offerType: freeBetBridgeModalState.offer_type,
              currentValue: freeBetBridgeModalState.offer_name,
            }
          )
        : [],
    [freeBetBridgeModalState, lookupValues, rows]
  );

  const specialOfferBookmakerSuggestion = useMemo(
    () => {
      const selectedCombo = commonBetCombos.find(
        (combo) => combo.preset_id === formState.source_combo_preset_id
      );
      const matchingCombos = selectedCombo
        ? [selectedCombo]
        : commonBetCombos.filter(
            (combo) => combo.offer_type === formState.offer_type && combo.bookmakers?.length
          );
      const knownBookmakers = [...new Set(matchingCombos.flatMap((combo) => combo.bookmakers || []))];
      const knowledgeLabel = selectedCombo?.name || formState.offer_type;
      return (
      getSpecialOfferBookmakerSuggestion({
        offerType: formState.offer_type,
        bookmaker: formState.bookmaker,
        accountAuthorities,
        knownBookmakers,
        knowledgeLabel,
      })
      );
    },
    [accountAuthorities, commonBetCombos, formState.bookmaker, formState.offer_type, formState.source_combo_preset_id]
  );

  const comboCoverageKey = specialOfferBookmakerSuggestion
    ? `${specialOfferBookmakerSuggestion.resolvedOfferKey}:${specialOfferBookmakerSuggestion.knownBookmakers.join("|")}`
    : "";
  const comboCoverageExpanded =
    comboCoveragePreference?.key === comboCoverageKey
      ? comboCoveragePreference.expanded
      : Boolean(specialOfferBookmakerSuggestion?.availableBookmakers.length);

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

  const exchangeCommissionLookup = useMemo(
    () =>
      Object.fromEntries(
        exchangeSettings.map((row) => [row.exchange_name, row.commission_rate])
      ),
    [exchangeSettings]
  );

  const resolvedCommission = useMemo(() => {
    return (
      exchangeSettings.find((row) => row.exchange_name === formState.exchange_name)?.commission_rate ??
      ""
    );
  }, [exchangeSettings, formState.exchange_name]);

  const resultOptions = useMemo(() => {
    const options = getSportsbookResultOptions(
      formState.offer_type,
      formState.match_strategy,
      formState.bonus_trigger
    );
    if (formState.result && !options.some((option) => option.value === formState.result)) {
      return [
        ...options,
        {
          value: formState.result,
          label: getSportsbookResultLabel(
            formState.result,
            formState.offer_type,
            formState.match_strategy,
            formState.bonus_trigger
          ),
        },
      ];
    }
    return options;
  }, [formState.bonus_trigger, formState.match_strategy, formState.offer_type, formState.result]);
  const quickSettlementOptions = useMemo(
    () =>
      resultOptions
        .filter((option) => option.value !== "Pending" && option.value !== "Void")
        .slice(0, 4),
    [resultOptions]
  );

  const isNoLayStrategy = formState.match_strategy === "No Lay";
  const usesMultiLayStrategy = isMultiLayStrategy(formState.match_strategy);
  const canUseFootballSettlesAssist =
    formState.fixture_type === "Football" && formState.date_settled.trim().length > 0;
  const showsLayMatchedStake = formState.match_strategy === "Partial Lay";
  const showsPlacementSection = !isNoLayStrategy && showsLayMatchedStake;
  const isCashbackOffer =
    formState.offer_type === "Cashback" || isBonusLockInOfferType(formState.offer_type);
  const isRefundOffer = isBonusLockInOfferType(formState.offer_type);
  const isProfitBoostOffer = formState.offer_type === "Profit Boost";
  const isFreeBetAwardableRow = isFreeBetAwardingOffer(formState.offer_type);
  const betSetupComplete = useMemo(() => getBetSetupComplete(formState), [formState]);
  const missingBetSetupFields = useMemo(() => getMissingBetSetupFields(formState), [formState]);
  const hasPersistedDraft = Boolean(formState.sportsbook_bet_id ?? selectedId);
  const canUseFreeBetBridge = isFreeBetAwardableRow && hasPersistedDraft;
  const freeBetBridgeComplete =
    formState.status === "Free Bet Awarded" ||
    linkedFreeBetRows.length > 0 ||
    freeBetBridgeCreatedCount > 0;
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
  const isSettledReadOnly = Boolean(
    isSettledBet && !settledEditEnabled && !isDirty && !revertSnapshot
  );
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
  const validationBannerScope = selectedId ?? formState.sportsbook_bet_id ?? "new-draft";
  const placementValidationBannerKey = useMemo(
    () =>
      `sportsbook-placement:${validationBannerScope}:${missingPlacementFields.join(
        "|"
      )}:${betSetupValidationActive}`,
    [betSetupValidationActive, missingPlacementFields, validationBannerScope]
  );
  const calculatorValidationBannerKey = useMemo(
    () => `sportsbook-calculator:${validationBannerScope}:${missingCalculatorFields.join("|")}`,
    [missingCalculatorFields, validationBannerScope]
  );
  const betSetupValidationBannerKey = useMemo(
    () => `sportsbook-bet-setup:${validationBannerScope}:${missingBetSetupFields.join("|")}`,
    [missingBetSetupFields, validationBannerScope]
  );
  const placementPlanRequired =
    formState.status === "Placed" ||
    formState.status === "Settled" ||
    formState.status === "Free Bet Awarded" ||
    formState.result !== "Pending";
  const editorTabs = useMemo<LedgerEditorTabDefinition[]>(
    () => [
      {
        id: "setup",
        label: "Bet Setup",
        requiredIssueCount: missingBetSetupFields.length,
        status:
          betSetupValidationActive && missingBetSetupFields.length > 0
            ? "invalid"
            : betSetupComplete
              ? "complete"
              : "neutral",
      },
      {
        id: "matching",
        label: "Matching",
        requiredIssueCount:
          missingCalculatorFields.length +
          (placementPlanRequired ? missingPlacementFields.length : 0),
        status: !calculatorUnlocked
          ? "locked"
          : missingCalculatorFields.length > 0 ||
              (placementPlanRequired && missingPlacementFields.length > 0)
            ? "invalid"
            : isPreviewReady
              ? "complete"
              : "neutral",
      },
      ...(showsPlacementSection
        ? [
            {
              id: "placement",
              label: "Placement",
              requiredIssueCount: placementPlanRequired ? missingPlacementFields.length : 0,
              status:
                placementPlanRequired && missingPlacementFields.length > 0
                  ? "invalid"
                  : selectedSportsbookRow?.lay_status === "Fully Laid"
                    ? "complete"
                    : "neutral",
            } satisfies LedgerEditorTabDefinition,
          ]
        : []),
      {
        id: "settlement",
        label: "Settlement",
        attentionState: getSettlementTabAttentionState({
          result: formState.result,
          settlementDate: formState.date_settled,
          status: formState.status,
        }),
        status:
          formState.status === "Settled" && formState.result !== "Pending"
            ? "complete"
            : "neutral",
      },
      ...(isFreeBetAwardableRow
        ? [
            {
              id: "free_bet",
              label: "Free Bet",
              status: !canUseFreeBetBridge
                ? "locked"
                : freeBetBridgeComplete
                  ? "complete"
                  : "warning",
              warningIssueCount: canUseFreeBetBridge && !freeBetBridgeComplete ? 1 : 0,
            } satisfies LedgerEditorTabDefinition,
          ]
        : []),
    ],
    [
      betSetupComplete,
      betSetupValidationActive,
      calculatorUnlocked,
      canUseFreeBetBridge,
      freeBetBridgeComplete,
      formState.date_settled,
      formState.result,
      formState.status,
      isFreeBetAwardableRow,
      isPreviewReady,
      missingBetSetupFields.length,
      missingCalculatorFields.length,
      missingPlacementFields.length,
      placementPlanRequired,
      selectedSportsbookRow?.lay_status,
      showsPlacementSection,
    ]
  );
  const safeActiveEditorTabId = editorTabs.some(
    (tab) => tab.id === activeEditorTabId && tab.status !== "locked"
  )
    ? activeEditorTabId
    : (editorTabs.find((tab) => tab.status !== "locked")?.id as SportsbookEditorTabId | undefined) ??
      "setup";
  const showFreeBetBridgeFooterAction =
    safeActiveEditorTabId === "free_bet" &&
    canUseFreeBetBridge &&
    Boolean(freeBetBridgeModalState);
  const navigableEditorTabs = editorTabs.filter((tab) => tab.status !== "locked");
  const activeEditorTabIndex = Math.max(
    0,
    navigableEditorTabs.findIndex((tab) => tab.id === safeActiveEditorTabId)
  );
  const previousEditorTab =
    activeEditorTabIndex > 0 ? navigableEditorTabs[activeEditorTabIndex - 1] : null;
  const nextEditorTab =
    activeEditorTabIndex >= 0 && activeEditorTabIndex < navigableEditorTabs.length - 1
      ? navigableEditorTabs[activeEditorTabIndex + 1]
      : null;
  const previewFormState = useMemo(
    () =>
      getPersistableSportsbookForm(formState, {
        resolvedCommission,
        exchangeCommissionLookup,
        outcome1Label: multiLayOutcome1Label,
        extraOutcomes: multiLayOutcomes,
        partialLayLegs,
        primaryPlacement: multiLayPrimaryPlacement,
      }),
    [
      exchangeCommissionLookup,
      formState,
      multiLayOutcome1Label,
      multiLayOutcomes,
      partialLayLegs,
      multiLayPrimaryPlacement,
      resolvedCommission,
    ]
  );
  const calculatorGuidance = useMemo(
    () => getCalculatorGuidance(formState, resolvedCommission),
    [formState, resolvedCommission]
  );
  const guidedEntryOutcomes = useMemo(
    () => [
      {
        label: multiLayOutcome1Label,
        layOdds: formState.lay_odds_1,
        placedMatchedStake: multiLayPrimaryPlacement.placedMatchedStake,
        placementState: multiLayPrimaryPlacement.placementState,
      },
      ...multiLayOutcomes.map((outcome) => ({
        label: outcome.label,
        layOdds: outcome.layOdds,
        placedMatchedStake: outcome.placedMatchedStake,
        placementState: outcome.placementState,
      })),
    ],
    [
      formState.lay_odds_1,
      multiLayOutcome1Label,
      multiLayOutcomes,
      multiLayPrimaryPlacement.placedMatchedStake,
      multiLayPrimaryPlacement.placementState,
    ]
  );
  const guidedEntry = useMemo(
    () =>
      getSportsbookGuidedEntry({
        ledger: "sportsbook",
        offer: formState.offer_text,
        bookmaker: formState.bookmaker,
        betType: formState.bet_type,
        offerType: formState.offer_type,
        offerName: formState.offer_name,
        fixtureType: formState.fixture_type,
        eventName: formState.event_name,
        backStake: formState.back_stake,
        backOdds:
          formState.offer_type === "Profit Boost" && formState.profit_boost_mode === "percentage"
            ? formState.base_back_odds
            : formState.back_odds,
        exchange: formState.exchange_name,
        layOdds1: formState.lay_odds_1,
        layActual: formState.lay_actual,
        strategy: formState.match_strategy,
        status: formState.status,
        result: formState.result,
        settlementDate: formState.date_settled,
        canCreateFreeBet: canUseFreeBetBridge,
        freeBetCreated: freeBetBridgeComplete,
        multiLayOutcomes: guidedEntryOutcomes,
      }),
    [canUseFreeBetBridge, formState, freeBetBridgeComplete, guidedEntryOutcomes]
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
        guidedFieldFallbackMessages[nextRequiredField] ||
        "Continue The Guided Workflow.",
    };
  }, [guidedEntry]);
  const guidedEntryVisible =
    workflowVisible && guidedAccessEnabled && !guidedEntryDismissed && safeGuidedEntry.state !== "complete";
  const guidedEntryMessageId = "sportsbook-guided-entry-message";
  const getGuidedFieldClass = useCallback(
    (field: GuidedEntryFieldKey, extraClass = "") => {
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
  const getGuidedDescribedBy = useCallback(
    (field: GuidedEntryFieldKey) =>
      guidedEntryVisible && safeGuidedEntry.nextRequiredField === field
        ? guidedEntryMessageId
        : undefined,
    [guidedEntryVisible, safeGuidedEntry.nextRequiredField]
  );
  const getGuidedFieldData = useCallback(
    (field: GuidedEntryFieldKey) => ({
      "data-guided-field": field,
    }),
    []
  );
  const guidedEntryTargetTabId = safeGuidedEntry.nextRequiredField
    ? guidedFieldTabMap[safeGuidedEntry.nextRequiredField]
    : null;
  const guidedEntryNeedsTabJump =
    guidedEntryTargetTabId !== null && guidedEntryTargetTabId !== safeActiveEditorTabId;
  const guidedEntryTargetTabIndex = guidedEntryTargetTabId
    ? editorTabs.findIndex((tab) => tab.id === guidedEntryTargetTabId)
    : -1;
  const guidedEntryTargetTabLabel = guidedEntryTargetTabId
    ? guidedTabLabels[guidedEntryTargetTabId]
    : "";
  const guidedEntryMessageText =
    safeGuidedEntry.message.trim() ||
    (safeGuidedEntry.nextRequiredField
      ? guidedFieldFallbackMessages[safeGuidedEntry.nextRequiredField]
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
  const openFreeBetBridgeModal = useCallback((record: SportsbookRecord) => {
    const settleDate = toDateTimeLocalValue(record.date_settled);
    const expiry = settleDate ? addDaysToDateTimeLocalValue(settleDate, 3) : "";
    const offerName = record.offer_name || record.offer_text || "Free bet from sportsbook";
    const betType = record.bet_type || "Single";
    const fixtureType = record.fixture_type || "Football";
    const freeBetValue = "5";
    setFreeBetBridgeModalState({
      sourceRowId: record.sportsbook_bet_id,
      bookmaker: record.bookmaker,
      offer_type: record.offer_type,
      offer_name: offerName,
      bet_type: betType,
      fixture_type: fixtureType,
      free_bet_status: "Available",
      free_bet_value: freeBetValue,
      expiry_datetime: expiry,
      retention_mode: "SNR",
      expected_award_value: freeBetValue,
      variance_reason: "",
      user_notes: "",
      splits: [
        createFreeBetBridgeSplit({
          value: freeBetValue,
          offerName,
          betType,
          fixtureType,
          expiry,
          retentionMode: "SNR",
        }),
      ],
    });
    setFreeBetBridgeCreatedCount(0);
    setFreeBetBridgeSplitsExpanded(false);
  }, []);
  const activateEditorTab = useCallback((tabId: SportsbookEditorTabId) => {
    if (
      tabId === "free_bet" &&
      canUseFreeBetBridge &&
      !freeBetBridgeModalState &&
      selectedSportsbookRow
    ) {
      openFreeBetBridgeModal(selectedSportsbookRow);
    }
    if (tabId === "free_bet" && canUseFreeBetBridge) {
      const sourceRowId =
        selectedSportsbookRow?.sportsbook_bet_id ?? formState.sportsbook_bet_id ?? selectedId;
      if (sourceRowId) {
        void loadLinkedFreeBets(sourceRowId);
      }
    }
    setActiveEditorTabId(tabId);
  }, [
    canUseFreeBetBridge,
    freeBetBridgeModalState,
    formState.sportsbook_bet_id,
    loadLinkedFreeBets,
    openFreeBetBridgeModal,
    selectedId,
    selectedSportsbookRow,
  ]);
  const focusGuidedEntryTarget = useCallback(() => {
    const nextField = safeGuidedEntry.nextRequiredField;
    if (!nextField) {
      return;
    }
    const nextTab = guidedFieldTabMap[nextField];
    activateEditorTab(nextTab);
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
  }, [activateEditorTab, safeGuidedEntry.nextRequiredField]);
  const renderGuidedEntryMessage = useCallback(
    (message: string) => {
      const safeMessage = message.trim() || "Continue The Guided Workflow.";
      const targetTerms = [
        "Settlement Date",
        "Offer Name",
        "Campaign Tag",
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
    },
    []
  );
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
          data-pd-id="sportsbook.editor.edit-settled-row"
          onClick={() => setSettledEditEnabled(true)}
          type="button"
        >
          EDIT
        </button>
      ) : (
        <span className="section-lock-chip" data-pd-id="sportsbook.editor.editing-state">
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
        multiLayOutcomes,
        multiLayPrimaryPlacement,
        exchangeCommissionLookup
      ),
    [
      exchangeCommissionLookup,
      formState,
      resolvedCommission,
      multiLayOutcome1Label,
      multiLayOutcomes,
      multiLayPrimaryPlacement,
    ]
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
  const hasMultiLayPartialMatch = useMemo(
    () => hasActualMultiLayPartialMatch(multiLayPlacementRows),
    [multiLayPlacementRows]
  );
  const visibleMultiLayPlacementStatus =
    multiLayPlacementStatus === "Part Laid" && !hasMultiLayPartialMatch
      ? "Not Laid"
      : multiLayPlacementStatus;
  const multiLayResultsGridRows = useMemo(
    () => getMultiLayResultsGridRows(formState, multiLayPlannerSummary),
    [formState, multiLayPlannerSummary]
  );
  const multiLayPrimaryLeg = multiLayPlannerSummary?.legs.find((leg) => leg.key === "outcome1");
  const multiLayPrimaryEffectiveStake = multiLayPrimaryLeg
    ? getEffectiveMultiLayStakeForLeg(formState.match_strategy, multiLayPrimaryLeg)
    : undefined;
  const multiLayPrimaryPartialOpen = isMultiLayPartialEntryOpen(
    "outcome1",
    multiLayPrimaryPlacement.placedMatchedStake,
    multiLayPrimaryEffectiveStake
  );
  const activeDisplayedValueLabel = activePreviewCalculation
    ? getDisplayedValueLabel(activePreviewCalculation, null)
    : selectedSportsbookRow
      ? getDisplayedValueLabel(null, selectedSportsbookRow)
      : "Current value";
  const activeDisplayedValue = activePreviewCalculation
    ? getDisplayedValue(activePreviewCalculation, null)
    : selectedSportsbookRow
      ? getDisplayedValue(null, selectedSportsbookRow)
      : "—";
  const activeDisplayedNumericValue = parseCurrencyLikeValue(activeDisplayedValue);
  const settlementHasFinalOutcome =
    formState.status === "Settled" && formState.result !== "Pending";
  const settlementPrimaryValue = activePreviewCalculation
    ? settlementHasFinalOutcome
      ? activePreviewCalculation.final_net_pnl ??
        activePreviewCalculation.reporting_value ??
        activePreviewCalculation.projected_current_pnl
      : activePreviewCalculation.projected_current_pnl ??
        activePreviewCalculation.reporting_value ??
        activePreviewCalculation.final_net_pnl
    : null;
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
  const editorLayStatus = isNoLayStrategy
    ? "Fully Laid"
    : usesMultiLayStrategy
      ? visibleMultiLayPlacementStatus
      : activePreviewCalculation?.lay_status ?? selectedSportsbookRow?.lay_status ?? "Not Laid";
  const editorMatchStrategyLabel = usesMultiLayStrategy
    ? `Multi Lay ${formState.match_strategy === "Multilay-Underlay" ? "Underlay" : ""}`.trim()
    : getCompactSportsbookLabel(formState.match_strategy || "Standard");
  const settlementReviewRule = useMemo(
    () =>
      getSettlementReviewRule(
        formState.offer_type,
        formState.result,
        formState.match_strategy
      ),
    [formState.match_strategy, formState.offer_type, formState.result]
  );
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
    recommendedNextLayStakeValue === null ? "—" : formatPreviewFinancialValue(recommendedNextLayStakeValue);
  const canCopyRecommendedNextLayStake =
    recommendedNextLayStakeValue !== null && recommendedNextLayStakeValue > 0;
  const hasPartialLayShortfall =
    partialLayExecutionSummary.remainingToMatch !== null &&
    partialLayExecutionSummary.remainingToMatch > 0;
  const hasPartialLayOvermatch = partialLayExecutionSummary.exceededTarget;

  const editorHeaderFullTitle = useMemo(() => {
    const parts = [formState.offer_text, formState.offer_name]
      .map((part) => part.trim())
      .filter(Boolean);
    const uniqueParts = Array.from(new Set(parts));
    if (uniqueParts.length > 0) {
      return uniqueParts.join(" · ");
    }

    const eventName = formState.event_name.trim();
    if (eventName) {
      return eventName;
    }

    return "New sportsbook row";
  }, [formState.event_name, formState.offer_name, formState.offer_text]);
  const editorHeaderTitle = useMemo(
    () => truncateHeaderTitle(editorHeaderFullTitle, 75),
    [editorHeaderFullTitle]
  );
  const backPlacementReady =
    parseNumericInput(formState.back_stake) !== null && parseNumericInput(formState.back_odds) !== null;
  const backPlacementConfirmed = ["Placed", "Settled", "Free Bet Awarded"].includes(
    formState.status
  );
  const sourceBackPlacementRecorded =
    ["Placed", "Settled"].includes(formState.status) ||
    (formState.status === "Free Bet Awarded" &&
      (parseNumericInput(formState.back_stake) !== null || parseNumericInput(formState.back_odds) !== null));
  const layPartiallyConfirmed =
    partialLayExecutionSummary.matchedTotal > 0 &&
    !partialLayExecutionSummary.hasReachedTarget;
  const layFullyConfirmed = partialLayExecutionSummary.hasReachedTarget;
  const layPlacementConfirmed = layPartiallyConfirmed || layFullyConfirmed;
  const sourceLayPlacementRecorded =
    layPlacementConfirmed ||
    parseNumericInput(formState.lay_actual) !== null ||
    parseNumericInput(formState.lay_matched_stake_1) !== null;
  const partialLayPanelTitle =
    partialLayLegs.length === 1 && layFullyConfirmed ? "Matched Lay" : "Partial Lay Legs";
  const shouldShowLayPlacementLegDetails =
    partialLayLegs.length > 0 &&
    !usesMultiLayStrategy &&
    (formState.match_strategy === "Partial Lay" || partialLayLegs.length > 1);
  const layPlacementReady =
    formState.match_strategy.trim().length > 0 &&
    formState.exchange_name.trim().length > 0 &&
    (usesMultiLayStrategy || parseNumericInput(formState.lay_odds_1) !== null);

  const layWorkflowMode = selectedLayWorkflowMode;
  const singleLayCalculatorMode = getCalculatorModeForLayWorkflowMode(layWorkflowMode);

  function updateDecimalFormField(field: keyof SportsbookFormState, value: string) {
    if (!isDecimalCalculatorInput(value)) {
      return;
    }
    setFormState((current) => ({ ...current, [field]: value }));
  }

  function applyLayWorkflowMode(mode: LayWorkflowMode) {
    setSelectedLayWorkflowMode(mode);
    setFormState((current) =>
      applyStrategyDefaults(current, getStrategyForLayWorkflowMode(mode, current.match_strategy))
    );
  }

  const customSliderSuggestedLayStake =
    parseNumericInput(
      activePreviewCalculation?.reference_lay_stake_standard ??
        selectedSportsbookRow?.reference_lay_stake_standard ??
        ""
    ) ??
    parseNumericInput(formState.lay_actual) ??
    parseNumericInput(formState.back_stake) ??
    10;
  const customSliderEffectiveMin = parseNumericInput(customSliderMin)
    ?? Math.max(0.01, Number((customSliderSuggestedLayStake - 1).toFixed(2)));
  const customSliderEffectiveMax = parseNumericInput(customSliderMax)
    ?? Number((customSliderSuggestedLayStake + 1).toFixed(2));
  const customSliderBoundedMax = Math.max(
    Number((customSliderEffectiveMin + 0.01).toFixed(2)),
    customSliderEffectiveMax
  );
  const customSliderDraftFloat = parseNumericInput(customSliderDraftValue);
  const customSliderCurrentFloat = Math.min(
    customSliderBoundedMax,
    Math.max(
      customSliderEffectiveMin,
      customSliderDraftFloat ??
        parseNumericInput(formState.lay_actual) ??
        customSliderSuggestedLayStake
    )
  );

  const singleLayResultCards = useMemo(() => {
    const backStake = parseNumericInput(formState.back_stake);
    const effectiveBackOdds = parseNumericInput(
      activePreviewCalculation?.effective_back_odds ?? formState.back_odds
    );
    const layOdds = parseNumericInput(formState.lay_odds_1);
    const commission = parseNumericInput(resolvedCommission) ?? 0;
    const stakeByMode: Record<SingleLayResultMode, string | null | undefined> = {
      Underlay:
        activePreviewCalculation?.reference_lay_stake_underlay ??
        selectedSportsbookRow?.reference_lay_stake_underlay,
      Standard:
        activePreviewCalculation?.reference_lay_stake_standard ??
        selectedSportsbookRow?.reference_lay_stake_standard,
      Overlay:
        activePreviewCalculation?.reference_lay_stake_overlay ??
        selectedSportsbookRow?.reference_lay_stake_overlay,
      Custom: formatPreviewMoney(customSliderCurrentFloat),
    };

    return getSingleLayResultModes(singleLayCalculatorMode).map((mode) => {
      const layStake = parseNumericInput(stakeByMode[mode] ?? "");
      const hasCalculation =
        backStake !== null && effectiveBackOdds !== null && layOdds !== null && layStake !== null;
      const liability =
        hasCalculation && layOdds !== null && layStake !== null ? layStake * (layOdds - 1) : null;
      const backWin =
        hasCalculation && backStake !== null && effectiveBackOdds !== null && liability !== null
          ? backStake * (effectiveBackOdds - 1) - liability
          : null;
      const layWin =
        hasCalculation && layStake !== null && backStake !== null
          ? layStake * (1 - commission) - backStake
          : null;
      return {
        mode,
        layStake,
        liability,
        backWin,
        layWin,
        canCopy: layStake !== null && layStake > 0 && formState.lay_odds_1.trim().length > 0,
      };
    });
  }, [
    activePreviewCalculation,
    formState.back_odds,
    formState.back_stake,
    formState.lay_odds_1,
    resolvedCommission,
    selectedSportsbookRow,
    customSliderCurrentFloat,
    singleLayCalculatorMode,
  ]);

  useEffect(() => {
    if (!calculatorCopyFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCalculatorCopyFeedback("");
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [calculatorCopyFeedback]);

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
    const nextRows =
      initialIssueFilter || feeReviewContext
        ? [...rows]
        : rows.filter((row) => isDateWithinResolvedRange(getSportsbookRangeAnchor(row), placedRange));

    if (feeReviewContext) {
      return nextRows.sort((left, right) =>
        left.sportsbook_bet_id.localeCompare(right.sportsbook_bet_id)
      );
    }

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
  }, [feeReviewContext, initialIssueFilter, placedRange, rows, tableMode]);

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
      if (feeReviewContext && !feeReviewContext.recordIds.includes(row.sportsbook_bet_id)) {
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
  }, [feeReviewContext, sortedReviewRows, tableFilters]);

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
    const rangeRows = initialIssueFilter
      ? rows
      : rows.filter((row) => isDateWithinResolvedRange(getSportsbookRangeAnchor(row), placedRange));
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
  }, [initialIssueFilter, placedRange, rows]);
  const quickViewRangeContext = initialIssueFilter
    ? "Action filter: all dates"
    : formatResolvedDateRange(placedRange);
  const quickViewRangeDetail = initialIssueFilter
    ? "Action filter: all dates"
    : formatResolvedDateRangeContext(placedRange);

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

  async function selectRow(rowId: string, options?: { collapseTable?: boolean }) {
    if (workflowVisible && rowId !== selectedId && isDirty && !(await confirmDiscardChanges())) {
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
    setPartialLayLegs(
      parsePartialLayLegs(record.multi_lay_outcomes_json, {
        exchangeName: record.exchange_name,
        layOdds: record.lay_odds_1,
        matchedStake: record.lay_matched_stake_1,
      })
    );
    setSelectedLayWorkflowMode(getLayWorkflowModeForStrategy(nextFormState.match_strategy));
    setMultiLayOutcome1Label(getMultiLayOutcomeLabel(record.multi_lay_outcome_1_name));
    setFormState(nextFormState);
    setPristineFormState(nextFormState);
    setShowBetSetupValidation(false);
    setActiveEditorTabId("setup");
    setGuidedEntryDismissed(false);
    setSettledEditEnabled(false);
    setRevertSnapshot(null);
    setFootballSettlesAssistUsed(false);
    setFootballSettlesOriginalValue(null);
    setErrorMessage("");
    setWorkflowVisible(true);
    setTableCollapsed(Boolean(options?.collapseTable));
    setStatusMessage("");
    revealEditor({ expandLedger: !options?.collapseTable });
  }

  async function openRowFreeBetBridge(record: SportsbookRecord) {
    await selectRow(record.sportsbook_bet_id);
    openFreeBetBridgeModal(record);
    activateEditorTab("free_bet");
  }

  async function startNewRow() {
    if (workflowVisible && isDirty && !(await confirmDiscardChanges())) {
      return;
    }
    setSelectedId(null);
    selectedIdRef.current = null;
    isCreatingDraftRef.current = true;
    setWorkflowVisible(true);
    setTableCollapsed(false);
    setPreviewCalculation(null);
    setMultiLayOutcomes(createDefaultMultiLayOutcomes());
    setMultiLayPrimaryPlacement(createDefaultMultiLayPrimaryPlacementState());
    setPartialLayLegs([]);
    setMultiLayOutcome1Label("");
    const blankForm = createBlankForm(defaultBonusRetentionRate);
    setSelectedLayWorkflowMode(getLayWorkflowModeForStrategy(blankForm.match_strategy));
    setFormState(blankForm);
    setPristineFormState(blankForm);
    setShowBetSetupValidation(false);
    setActiveEditorTabId("setup");
    setGuidedEntryDismissed(false);
    setSettledEditEnabled(false);
    setRevertSnapshot(null);
    setFootballSettlesAssistUsed(false);
    setFootballSettlesOriginalValue(null);
    setErrorMessage("");
    setStatusMessage("");
    revealEditor({ expandLedger: true });
  }

  async function closeEditor() {
    if (isDirty && !(await confirmDiscardChanges())) {
      return;
    }
    setWorkflowVisible(false);
    setSelectedId(null);
    selectedIdRef.current = null;
    setGuidedEntryDismissed(false);
    ignoreInitialRecordIdRef.current = true;
    isCreatingDraftRef.current = false;
    setRevertSnapshot(null);
    setTableCollapsed(false);
    setStatusMessage("");
  }

  function canPersistForm(nextFormState: SportsbookFormState): boolean {
    return (
      getBetSetupComplete(nextFormState) &&
      getMissingPlacementFields(nextFormState, resolvedCommission, multiLayOutcomes).length === 0
    );
  }

  function queueSportsbookSaveNotification(saved: SportsbookRecord): void {
    const workflowStage =
      saved.status === "Settled"
        ? "settled"
        : saved.status === "Placed" || saved.status === "Free Bet Awarded"
          ? "placed"
          : "draft";
    const notificationTitle =
      workflowStage === "settled"
        ? "Sportsbook row settled"
        : workflowStage === "placed"
          ? "Sportsbook row placed"
          : "Sportsbook draft saved";
    const eventLabel =
      saved.event_name || saved.offer_text || saved.offer_name || saved.sportsbook_bet_id;

    addOrReplaceLocalFundManagerNotification({
      notification_id: `sportsbook-save:${profileId}:${saved.sportsbook_bet_id}:${workflowStage}`,
      notification_type: `sportsbook_${workflowStage}_saved`,
      title: notificationTitle,
      ledger_label: "Sportsbook Bets",
      bookmaker_label: saved.bookmaker || "Bookmaker not set",
      message: eventLabel,
      profile_id: profileId,
      profile_name: profileId,
      record_id: saved.sportsbook_bet_id,
      href: `/profiles/${profileId}/tracker/sportsbook-bets?record=${encodeURIComponent(saved.sportsbook_bet_id)}`,
      due_at: saved.date_settled || saved.updated_at || new Date().toISOString(),
      settles_at: saved.date_settled || saved.updated_at || new Date().toISOString(),
      tone: workflowStage === "draft" ? "info" : "success",
    });
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
  ): Promise<boolean> {
    if (isPersistingRef.current) {
      return false;
    }

    setErrorMessage("");
    const resolvedMultiLayOutcomes = options?.multiLayOutcomesOverride ?? multiLayOutcomes;
    const resolvedMultiLayPrimaryPlacement =
      options?.multiLayPrimaryPlacementOverride ?? multiLayPrimaryPlacement;
    const resolvedPartialLayLegs = options?.partialLayLegsOverride ?? partialLayLegs;
    const persistableFormState = getPersistableSportsbookForm(nextFormState, {
      resolvedCommission,
      exchangeCommissionLookup,
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
      return false;
    }

    isPersistingRef.current = true;
    setIsPersisting(true);

    try {

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
      return false;
    }

    if (persistableFormState !== nextFormState) {
      setFormState(persistableFormState);
    }

    const saved = (await response.json()) as SportsbookRecord;
    invalidateCachedJson(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`);
    dispatchTrackerDataUpdated({ ledger: "sportsbook-bets", profileId });
    const savedFormState = recordToForm(saved);
    const savedMultiLay = parseMultiLayOutcomes(saved.multi_lay_outcomes_json, {
      outcome1Label: saved.multi_lay_outcome_1_name,
      layOdds1: saved.lay_odds_1,
      exchangeName: saved.exchange_name,
      layActual: saved.lay_actual,
    });
    setRows((current) => {
      const rowExists = current.some(
        (row) => row.sportsbook_bet_id === saved.sportsbook_bet_id
      );
      return rowExists
        ? current.map((row) =>
            row.sportsbook_bet_id === saved.sportsbook_bet_id ? saved : row
          )
        : [saved, ...current];
    });
    const returnToLedger = options?.returnToLedgerOnSuccess ?? !options?.autosaveLabel;
    if (returnToLedger) {
      ignoreInitialRecordIdRef.current = true;
    }
    setSelectedId(returnToLedger ? null : saved.sportsbook_bet_id);
    selectedIdRef.current = returnToLedger ? null : saved.sportsbook_bet_id;
    setFormState(savedFormState);
    setPristineFormState(savedFormState);
    setMultiLayOutcome1Label(getMultiLayOutcomeLabel(saved.multi_lay_outcome_1_name));
    setMultiLayOutcomes(savedMultiLay.extraOutcomes);
    setMultiLayPrimaryPlacement(savedMultiLay.primaryPlacement);
    setPartialLayLegs(
      parsePartialLayLegs(saved.multi_lay_outcomes_json, {
        exchangeName: saved.exchange_name,
        layOdds: saved.lay_odds_1,
        matchedStake: saved.lay_matched_stake_1,
      })
    );
    setShowBetSetupValidation(false);
    setSettledEditEnabled(false);
    if (!options?.autosaveLabel) {
      setRevertSnapshot(null);
    }
    if (!isEditing && returnToLedger) {
      setQuery("");
      setCurrentPage(1);
    }
    if (returnToLedger) {
      setWorkflowVisible(false);
      isCreatingDraftRef.current = false;
      setTableCollapsed(false);
    }
    if (workflowVisible) {
      queueSportsbookSaveNotification(saved);
      setStatusMessage("");
    } else {
      setStatusMessage(
        options?.autosaveLabel
          ? `${options.autosaveLabel} autosaved for ${saved.sportsbook_bet_id}.`
          : isEditing
            ? `Updated sportsbook bet ${saved.sportsbook_bet_id}.`
            : `Created sportsbook bet ${saved.sportsbook_bet_id}.`
      );
    }
    return true;
    } finally {
      isPersistingRef.current = false;
      setIsPersisting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await persistForm(formState);
  }

  async function applyDropdownChange(
    updater: (current: SportsbookFormState) => SportsbookFormState,
    autosaveLabel: string
  ) {
    const previousFormState = formState;
    const nextFormState = updater(previousFormState);
    setRevertSnapshot(previousFormState);
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

  function loadEditorFormState(
    nextFormState: SportsbookFormState,
    options?: { markPristine?: boolean }
  ) {
    const parsedMultiLay = parseMultiLayOutcomes(nextFormState.multi_lay_outcomes_json, {
      outcome1Label: nextFormState.multi_lay_outcome_1_name,
      layOdds1: nextFormState.lay_odds_1,
      exchangeName: nextFormState.exchange_name,
      layActual: nextFormState.lay_actual,
    });
    setPreviewCalculation(null);
    setMultiLayOutcomes(parsedMultiLay.extraOutcomes);
    setMultiLayPrimaryPlacement(parsedMultiLay.primaryPlacement);
    setPartialLayLegs(
      parsePartialLayLegs(nextFormState.multi_lay_outcomes_json, {
        exchangeName: nextFormState.exchange_name,
        layOdds: nextFormState.lay_odds_1,
        matchedStake: nextFormState.lay_matched_stake_1,
      })
    );
    setMultiLayOutcome1Label(getMultiLayOutcomeLabel(nextFormState.multi_lay_outcome_1_name));
    setFormState(nextFormState);
    setCustomSliderDraftValue("");
    if (options?.markPristine) {
      setPristineFormState(nextFormState);
    }
    setShowBetSetupValidation(false);
    setSettledEditEnabled(false);
    setSettledDeleteGuardRowId(null);
    setSettledDeleteReason("");
    setFootballSettlesAssistUsed(false);
    setFootballSettlesOriginalValue(null);
    setPendingBackPlacementRevert(false);
    setPendingLayPlacementRevert(false);
    setErrorMessage("");
  }

  async function handleResetForm() {
    if (revertSnapshot) {
      loadEditorFormState(revertSnapshot);
      const rowId = revertSnapshot.sportsbook_bet_id ?? selectedId;
      if (rowId && canPersistForm(revertSnapshot)) {
        const reverted = await persistForm(revertSnapshot, {
          autosaveLabel: "Revert sportsbook row",
          returnToLedgerOnSuccess: false,
          suppressMissingRequiredMessage: true,
        });
        if (!reverted) {
          return;
        }
      }
      setRevertSnapshot(null);
      setStatusMessage("Reverted the last sportsbook change.");
      return;
    }

    if (selectedSportsbookRow) {
      const nextFormState = recordToForm(selectedSportsbookRow);
      loadEditorFormState(nextFormState, { markPristine: true });
      setStatusMessage(
        `Reverted unsaved changes for sportsbook bet ${selectedSportsbookRow.sportsbook_bet_id}.`
      );
      return;
    }

    const blankForm = createBlankForm(defaultBonusRetentionRate);
    loadEditorFormState(blankForm, { markPristine: true });
    setMultiLayOutcomes(createDefaultMultiLayOutcomes());
    setMultiLayPrimaryPlacement(createDefaultMultiLayPrimaryPlacementState());
    setPartialLayLegs([]);
    setMultiLayOutcome1Label("");
    setStatusMessage("Cleared the unsaved sportsbook bet draft.");
  }

  function handleCancelSettledEdit() {
    loadEditorFormState(pristineFormState, { markPristine: true });
    setRevertSnapshot(null);
    setSettledEditEnabled(false);
    setSettledDeleteGuardRowId(null);
    setSettledDeleteReason("");
    setStatusMessage("");
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

  async function handleDeleteSelectedRow(
    rowId = selectedId,
    options?: { confirmedSettledReason?: string }
  ) {
    if (!rowId) {
      return;
    }

    const rowForDelete =
      selectedSportsbookRow?.sportsbook_bet_id === rowId
        ? selectedSportsbookRow
        : rows.find((row) => row.sportsbook_bet_id === rowId);
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
        message: `Delete sportsbook row ${rowId}? This will remove it from this profile tracker.`,
        title: "Delete sportsbook row?",
      });
      if (!confirmed) {
        return;
      }
    }

    setErrorMessage("");
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${rowId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const detail = await response.text();
      setErrorMessage(detail || "Unable to delete sportsbook row");
      return;
    }

    invalidateCachedJson(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`);
    dispatchTrackerDataUpdated({ ledger: "sportsbook-bets", profileId });
    await loadRows(null);
    if (selectedId === rowId) setWorkflowVisible(false);
    isCreatingDraftRef.current = false;
    setStatusMessage(`Deleted sportsbook bet ${rowId}.`);
    if (feeReviewContext) await refreshFeeReviewResolutionSession(apiBaseUrl, feeReviewContext);
  }

  async function updateRowFromTable(
    record: SportsbookRecord,
    overrides: Partial<SportsbookFormState>,
    successMessage: string,
    options?: {
      keepEditorOpen?: boolean;
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

    invalidateCachedJson(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`);
    dispatchTrackerDataUpdated({ ledger: "sportsbook-bets", profileId });
    await loadRows(
      options?.preserveTableView && !options.keepEditorOpen ? null : record.sportsbook_bet_id
    );
    if (options?.preserveTableView && !options.keepEditorOpen) {
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

  function openPartialLayReminderEditor(record: SportsbookRecord) {
    const wasActive = record.partial_lay_reminder_state === "Active";
    setPartialLayReminderEditorState({
      rowId: record.sportsbook_bet_id,
      due_at:
        (wasActive ? toDateTimeLocalValue(record.partial_lay_reminder_due_at) : "") ||
        getPartialLayReminderDefaultDueAt(toDateTimeLocalValue(record.date_settled)),
      reason: wasActive ? record.partial_lay_reminder_reason : "",
      resolution_note: "",
      wasActive,
    });
  }

  async function submitPartialLayReminder(
    state: "Active" | "Resolved" | "Dismissed"
  ) {
    if (!partialLayReminderEditorState) {
      return;
    }

    setErrorMessage("");
    setIsPartialLayReminderSaving(true);
    try {
      if (isDirty) {
        const rowSaved = await persistForm(formState, {
          autosaveLabel: "Partial-lay reminder row",
          returnToLedgerOnSuccess: false,
        });
        if (!rowSaved) {
          return;
        }
      }

      const response = await fetch(
        `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${partialLayReminderEditorState.rowId}/partial-lay-reminder`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            state,
            due_at: fromDateTimeLocalValue(partialLayReminderEditorState.due_at),
            reason: partialLayReminderEditorState.reason,
            resolution_note: partialLayReminderEditorState.resolution_note,
            actor_id: "fund-manager-local",
          }),
        }
      );
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as { detail?: string } | null;
        setErrorMessage(detail?.detail ?? "Unable to update the partial-lay reminder.");
        return;
      }

      const updatedRecord = (await response.json()) as SportsbookRecord;
      invalidateCachedJson(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`);
      dispatchTrackerDataUpdated({ ledger: "sportsbook-bets", profileId });
      setRows((current) =>
        current.map((row) =>
          row.sportsbook_bet_id === updatedRecord.sportsbook_bet_id ? updatedRecord : row
        )
      );
      setPartialLayReminderEditorState(null);
      window.dispatchEvent(new Event(FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT));
      setStatusMessage(
        state === "Active"
          ? "Partial-lay recheck reminder saved."
          : state === "Resolved"
            ? "Partial-lay recheck reminder resolved with an audit note."
            : "Partial-lay recheck reminder dismissed with an audit note."
      );
    } finally {
      setIsPartialLayReminderSaving(false);
    }
  }

  function clearFreeBetBridgeDefaults() {
    setFreeBetBridgeModalState((current) =>
      current
        ? {
            ...current,
            offer_name: "",
            bet_type: "",
            fixture_type: "",
            free_bet_status: "Available",
            free_bet_value: "",
            expiry_datetime: "",
            retention_mode: "SNR",
            expected_award_value: "",
            variance_reason: "",
            user_notes: "",
            splits: [createClearedFreeBetBridgeSplit()],
          }
        : current
    );
    setFreeBetBridgeSplitsExpanded(false);
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

    if (getSettlementValidationMessage(
      outcomeModalState.status,
      outcomeModalState.result,
      outcomeModalState.date_settled
    )) return;

    const saved = await updateRowFromTable(
      sourceRow,
      {
        status: outcomeModalState.status,
        result: outcomeModalState.result,
        date_settled: outcomeModalState.date_settled,
      },
      `Updated outcome details for ${sourceRow.sportsbook_bet_id}.`,
      { preserveTableView: true }
    );
    if (saved) {
      setOutcomeModalState(null);
      if (feeReviewContext) await refreshFeeReviewResolutionSession(apiBaseUrl, feeReviewContext);
    }
  }

  async function submitFreeBetBridgeModal() {
    if (!freeBetBridgeModalState || isFreeBetBridgeSubmitting) {
      return;
    }

    const sourceRow = rows.find((row) => row.sportsbook_bet_id === freeBetBridgeModalState.sourceRowId);
    if (!sourceRow) {
      setStatusMessage("Sportsbook row could not be found for free-bet bridge.");
      return;
    }

    setErrorMessage("");
    const validationMessage = getFreeBetBridgeValidationMessage(freeBetBridgeModalState);
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    const freeBetStatus = freeBetBridgeModalState.free_bet_status || "Available";
    const awardGroupId = `AWARD-${freeBetBridgeModalState.sourceRowId}-${Date.now()}`;
    const createdFreeBetIds: string[] = [];

    setIsFreeBetBridgeSubmitting(true);
    try {
      for (const [index, split] of freeBetBridgeModalState.splits.entries()) {
        const splitNotes = split.user_notes.trim();
        const bridgeNotes = freeBetBridgeModalState.user_notes.trim();
        const varianceNote = hasFreeBetBridgeVariance(freeBetBridgeModalState)
          ? `Award split variance: ${freeBetBridgeModalState.variance_reason.trim()}`
          : "";
        const userNotes = [bridgeNotes, splitNotes, varianceNote].filter(Boolean).join("\n");
        const freeBetCreateResponse = await fetch(`${apiBaseUrl}/profiles/${profileId}/free-bets`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event_name: sourceRow.event_name,
            offer_text: sourceRow.offer_text || sourceRow.offer_name || "Free bet from sportsbook",
            bookmaker: freeBetBridgeModalState.bookmaker,
            offer_type: freeBetBridgeModalState.offer_type,
            bet_type: split.bet_type,
            offer_name: split.offer_name,
            fixture_type: split.fixture_type,
            status: freeBetStatus,
            result: "Pending",
            retention_mode: split.retention_mode,
            free_bet_value: split.free_bet_value,
            back_odds: "",
            match_strategy: "Standard",
            lay_odds_1: "",
            lay_actual: "",
            lay_matched_stake_1: "",
            lay_commission_1: "",
            exchange_name: "",
            expiry_datetime: fromDateTimeLocalValue(split.expiry_datetime),
            date_settled: "",
            origin_qual_bet_id: freeBetBridgeModalState.sourceRowId,
            offer_group_id: awardGroupId,
            source_award_group_id: awardGroupId,
            source_award_split_index: index + 1,
            source_award_split_total: freeBetBridgeModalState.splits.length,
            source_award_expected_value: freeBetBridgeModalState.expected_award_value,
            source_award_variance_reason: freeBetBridgeModalState.variance_reason.trim(),
            user_notes: userNotes,
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
        createdFreeBetIds.push(createdFreeBet.free_bet_id);
      }
      invalidateCachedJson(`${apiBaseUrl}/profiles/${profileId}/free-bets`);
      dispatchTrackerDataUpdated({ ledger: "free-bets", profileId });
      setFreeBetBridgeCreatedCount((count) => count + createdFreeBetIds.length);

      if (sourceRow.status !== "Free Bet Awarded") {
        const updated = await updateRowFromTable(
          sourceRow,
          {
            status: "Free Bet Awarded",
            result: sourceRow.result,
          },
          `Created ${createdFreeBetIds.length} free bet${createdFreeBetIds.length === 1 ? "" : "s"} and marked ${sourceRow.sportsbook_bet_id} as free bet awarded.`,
          { keepEditorOpen: true, preserveTableView: true }
        );
        if (!updated) {
          return;
        }
        setFormState((current) => ({
          ...current,
          status: "Free Bet Awarded",
        }));
      } else {
        invalidateCachedJson(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`);
        dispatchTrackerDataUpdated({ ledger: "sportsbook-bets", profileId });
        await loadRows(null);
      }

      setStatusMessage(
        `Created ${createdFreeBetIds.length} free bet${createdFreeBetIds.length === 1 ? "" : "s"} from ${sourceRow.sportsbook_bet_id}.`
      );
      void loadLinkedFreeBets(sourceRow.sportsbook_bet_id);
      setFreeBetBridgeModalState((current) => {
        if (!current) {
          return current;
        }

        const settleDate = toDateTimeLocalValue(sourceRow.date_settled);
        const expiry = settleDate ? addDaysToDateTimeLocalValue(settleDate, 3) : "";
        const freeBetValue = current.free_bet_value || "5";
        const offerName = current.offer_name || sourceRow.offer_name || sourceRow.offer_text || "Free bet from sportsbook";
        const betType = current.bet_type || sourceRow.bet_type || "Single";
        const fixtureType = current.fixture_type || sourceRow.fixture_type || "Football";
        const retentionMode = current.retention_mode || "SNR";

        return {
          ...current,
          free_bet_status: current.free_bet_status || "Available",
          free_bet_value: freeBetValue,
          expected_award_value: freeBetValue,
          expiry_datetime: expiry,
          variance_reason: "",
          user_notes: "",
          splits: [
            createFreeBetBridgeSplit({
              value: freeBetValue,
              offerName,
              betType,
              fixtureType,
              expiry,
              retentionMode,
            }),
          ],
        };
      });
      setFreeBetBridgeSplitsExpanded(false);
      setActiveEditorTabId("free_bet");
    } finally {
      setIsFreeBetBridgeSubmitting(false);
    }
  }

  function getLinkedFreeBetRemovalBlockReason(row: LinkedFreeBetRecord): string {
    if (sourceBackPlacementRecorded || sourceLayPlacementRecorded) {
      return "Remove sportsbook back and lay placement first.";
    }
    if (!canRemoveLinkedFreeBet(row)) {
      return "This free bet has already moved beyond an unplaced award state.";
    }
    return "";
  }

  async function removeLinkedFreeBet(row: LinkedFreeBetRecord) {
    const blockReason = getLinkedFreeBetRemovalBlockReason(row);
    if (blockReason || isLinkedFreeBetRemoving) {
      if (blockReason) {
        setStatusMessage(blockReason);
      }
      return;
    }

    setIsLinkedFreeBetRemoving(true);
    setErrorMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/free-bets/${row.free_bet_id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const detail = await response.text();
        setErrorMessage(detail || "Unable to remove linked free-bet row.");
        return;
      }

      invalidateCachedJson(`${apiBaseUrl}/profiles/${profileId}/free-bets`);
      dispatchTrackerDataUpdated({ ledger: "free-bets", profileId });
      const sourceRowId = formState.sportsbook_bet_id ?? selectedId;
      const remainingRows = linkedFreeBetRows.filter(
        (linkedRow) => linkedRow.free_bet_id !== row.free_bet_id
      );
      setLinkedFreeBetRows(remainingRows);
      setLinkedFreeBetRemovalId(null);

      if (sourceRowId && remainingRows.length === 0 && formState.status === "Free Bet Awarded") {
        const sourceRow = rows.find((entry) => entry.sportsbook_bet_id === sourceRowId);
        if (sourceRow) {
          const updated = await updateRowFromTable(
            sourceRow,
            {
              status: "Prospecting",
              result: "Pending",
            },
            "Removed linked free-bet rows and reopened the sportsbook row as prospecting.",
            { keepEditorOpen: true, preserveTableView: true }
          );
          if (updated) {
            setFormState((current) => ({
              ...current,
              status: "Prospecting",
              result: "Pending",
            }));
            setPristineFormState((current) => ({
              ...current,
              status: "Prospecting",
              result: "Pending",
            }));
          }
        }
      } else if (sourceRowId) {
        await loadLinkedFreeBets(sourceRowId);
      }

      setStatusMessage(`Removed linked free bet ${row.free_bet_id}.`);
    } finally {
      setIsLinkedFreeBetRemoving(false);
    }
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

    const matchedLayLeg: PartialLayLegInput = {
      id: createPartialLayLegId(1),
      exchangeName: formState.exchange_name,
      layOdds: formState.lay_odds_1,
      matchedStake: nextSuggestedLay,
      isFinal: true,
    };

    setPartialLayLegs([matchedLayLeg]);
    setPendingLegRemovalId(null);
    setLastRemovedPartialLayLeg(null);
    setPendingLayPlacementRevert(false);
    setFormState((current) => ({
      ...current,
      lay_actual: nextSuggestedLay,
      lay_matched_stake_1: nextSuggestedLay,
      match_strategy: mode,
      status: current.status === "Prospecting" ? "Placed" : current.status,
      result: current.result || "Pending",
    }));

    const copied = await copyToClipboard(nextSuggestedLay);
    setCalculatorCopyFeedback(
      copied
        ? `${mode} lay copied and marked fully placed.`
        : `${mode} lay applied and marked fully placed.`
    );
  }

  async function handleFreeBetBridgeFooterAction() {
    if (!canUseFreeBetBridge) {
      setStatusMessage("Save this row first before creating a free bet from it.");
      return;
    }

    if (safeActiveEditorTabId === "free_bet" && freeBetBridgeModalState) {
      await submitFreeBetBridgeModal();
      return;
    }

    setActiveEditorTabId("free_bet");
  }

  async function applyCustomLayValue() {
    const value =
      customSliderDraftValue.trim() ||
      formState.lay_actual.trim() ||
      formatPreviewMoney(customSliderCurrentFloat);
    if (!value) {
      return;
    }

    const matchedLayLeg: PartialLayLegInput = {
      id: createPartialLayLegId(1),
      exchangeName: formState.exchange_name,
      layOdds: formState.lay_odds_1,
      matchedStake: value,
      isFinal: true,
    };

    setPartialLayLegs([matchedLayLeg]);
    setPendingLegRemovalId(null);
    setLastRemovedPartialLayLeg(null);
    setPendingLayPlacementRevert(false);
    setFormState((current) => ({
      ...current,
      lay_actual: value,
      lay_matched_stake_1: value,
      match_strategy: "Custom",
      status: current.status === "Prospecting" ? "Placed" : current.status,
      result: current.result || "Pending",
    }));

    const copied = await copyToClipboard(value);
    setCalculatorCopyFeedback(
      copied
        ? "Custom lay copied and marked fully placed."
        : "Custom lay applied and marked fully placed."
    );
  }

  function commitCustomSliderValue(value?: string) {
    const nextValue = formatPreviewMoney(
      parseNumericInput(value ?? customSliderDraftValue) ?? customSliderCurrentFloat
    );
    setCustomSliderDraftValue("");
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
      setPendingBackPlacementRevert(false);
    }

    if (result.statusMessage) {
      setStatusMessage(result.statusMessage);
    }
  }

  function revertBackPlacement() {
    if (isSettledReadOnly) return;
    setFormState((current) => ({
      ...current,
      status: "Prospecting",
      result: "Pending",
    }));
    setPendingBackPlacementRevert(false);
    setStatusMessage("Back placement reopened. Save the sportsbook row to keep this correction.");
  }

  function requestRevertBackPlacement() {
    if (isSettledReadOnly) return;
    setPendingBackPlacementRevert(true);
  }

  function requestRevertLayPlacement() {
    if (isSettledReadOnly) return;
    setPendingLayPlacementRevert(true);
  }

  function revertLayPlacement() {
    if (isSettledReadOnly) return;
    setPartialLayLegs([]);
    setPendingLegRemovalId(null);
    setPendingLayPlacementRevert(false);
    setLastRemovedPartialLayLeg(null);
    setFormState((current) => ({
      ...current,
      lay_actual: "",
      lay_matched_stake_1: "",
    }));
    setStatusMessage("Lay placement reopened. Save the sportsbook row to keep this correction.");
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
    setPartialMultiLayBranches((current) => {
      const next = new Set(current);
      next.delete(leg.key);
      return next;
    });

    if (leg.key === "outcome1") {
      const nextPrimaryPlacement: MultiLayPrimaryPlacementState = {
        placedExchange: leg.exchangeName || formState.exchange_name,
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
            placedExchange: leg.exchangeName || formState.exchange_name,
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

  function updatePrimaryMultiLayOutcomeLabel(value: string) {
    const nextLabel = sanitizeMultiLayOutcomeLabel(value);
    setMultiLayOutcome1Label(nextLabel);
    setFormState((current) => ({
      ...current,
      multi_lay_outcome_1_name: nextLabel,
    }));
  }

  function isMultiLayPartialEntryOpen(
    branchKey: string,
    matchedStake: string,
    targetStake: string | undefined
  ) {
    if (partialMultiLayBranches.has(branchKey)) {
      return true;
    }

    const matched = parseNumericInput(matchedStake);
    const target = targetStake ? parseNumericInput(targetStake) : null;
    return matched !== null && target !== null && matched < target - 0.005;
  }

  function setMultiLayPartialEntry(branchKey: string, enabled: boolean, targetStake: string | undefined) {
    setPartialMultiLayBranches((current) => {
      const next = new Set(current);
      if (enabled) {
        next.add(branchKey);
      } else {
        next.delete(branchKey);
      }
      return next;
    });

    const nextMatchedStake = targetStake || "";
    const nextPlacementState = targetStake ? "placed" : "pending";

    if (branchKey === "outcome1") {
      setMultiLayPrimaryPlacement((current) => ({
        ...current,
        placedMatchedStake: nextMatchedStake,
        placementState: nextPlacementState,
      }));
      return;
    }

    setMultiLayOutcomes((current) =>
      current.map((entry) =>
        entry.id === branchKey
          ? {
              ...entry,
              placedMatchedStake: nextMatchedStake,
              placementState: nextPlacementState,
            }
          : entry
      )
    );
  }

  function resetMultiLayPartialEntry(branchKey: string, targetStake: string | undefined) {
    setPartialMultiLayBranches((current) => {
      const next = new Set(current);
      next.delete(branchKey);
      return next;
    });

    const nextMatchedStake = targetStake || "";
    const nextPlacementState = targetStake ? "placed" : "pending";

    if (branchKey === "outcome1") {
      setMultiLayPrimaryPlacement((current) => ({
        ...current,
        placedMatchedStake: nextMatchedStake,
        placementState: nextPlacementState,
      }));
      return;
    }

    setMultiLayOutcomes((current) =>
      current.map((entry) =>
        entry.id === branchKey
          ? {
              ...entry,
              placedMatchedStake: nextMatchedStake,
              placementState: nextPlacementState,
            }
          : entry
      )
    );
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
          placedExchange: formState.exchange_name || exchangeOptions[0] || "",
          placedLayOdds: "",
          placedMatchedStake: "",
          placementState: "pending",
        },
      ];
    });
  }

  function removeMultiLayOutcome(outcomeId: string) {
    setPartialMultiLayBranches((current) => {
      const next = new Set(current);
      next.delete(outcomeId);
      return next;
    });
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
              onClick={() => void openRowFreeBetBridge(sourceRow)}
              type="button"
            >
              <span aria-hidden="true">💰+</span>
            </button>
          ) : (
            <span aria-hidden="true" className="table-action-button table-action-button-placeholder" />
          )}
          <button
            aria-label={`Copy ${sourceRow.sportsbook_bet_id} to other profiles`}
            className="icon-button table-action-button"
            data-pd-id="sportsbook.actions.copy-to-profiles"
            onClick={() => setMultiProfileCopySource(sourceRow)}
            title="Copy to profiles"
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined">group_add</span>
          </button>
          <button
            aria-label={`Delete sportsbook row ${sourceRow.sportsbook_bet_id}`}
            className="icon-button icon-button-destructive table-action-button"
            onClick={() => void handleDeleteSelectedRow(sourceRow.sportsbook_bet_id)}
            title={`Delete ${sourceRow.sportsbook_bet_id}`}
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

    return (
      <span className="table-cell-text">
        {value}
      </span>
    );
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
          <h1 className="sportsbook-page-title">Sportsbook Bets</h1>
        </div>
        {isInitialLoading ? (
          <LedgerLoadingIndicator label="Loading sportsbook ledger" />
        ) : null}
        <section className="stat-strip" aria-label="Sportsbook quick view">
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
            <strong><FinancialValue value={quickView.totalReportingValue} /></strong>
            <span>Current ledger total</span>
          </article>
        </section>
        <div className="sportsbook-review-bar" aria-label="Sportsbook ledger controls" role="toolbar">
          <label className="field-control table-search-field">
            <span className="visually-hidden">Search sportsbook rows</span>
            <input aria-label="Search sportsbook rows" onChange={(event) => { setQuery(event.target.value); setCurrentPage(1); }} placeholder="Search sportsbook rows" type="search" value={query} />
          </label>
          <LedgerAddRowButton label="Add sportsbook row" onClick={() => void startNewRow()} />
          <div className="table-filter-button-wrap">
            <button aria-label="Open sportsbook filter and column controls" className={`icon-button table-filter-button${hasActiveTableControls ? " has-active-table-controls" : ""}`} onClick={() => setIsFilterModalOpen(true)} title="Filter and columns" type="button">
              <svg aria-hidden="true" className="table-filter-icon" fill="none" viewBox="0 0 24 24"><path d="M4 6h16l-6.5 7.3v4.9l-3 1.8v-6.7L4 6Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>
              {hasActiveTableControls ? <span aria-label={`${activeTableControlCount} active table controls`} className="table-filter-badge">{activeTableControlCount > 9 ? "9+" : activeTableControlCount}</span> : null}
            </button>
            {hasActiveTableControls ? <button aria-label="Clear active sportsbook filters and hidden-column states" className="table-filter-clear" onClick={() => { clearTableFilters(); setVisibleColumnKeys(new Set(defaultVisibleSportsbookColumns)); }} type="button">×</button> : null}
          </div>
        </div>
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
                          onClick={() => void selectRow(rowId)}
                          onDoubleClick={() => void selectRow(rowId, { collapseTable: true })}
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
            aria-modal="true"
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
              <label className={`field-control${tableFilters.issue_type !== "any" ? " is-active-filter" : ""}`}>
                <span>Issue type</span>
                <select
                  onChange={(event) =>
                    updateTableFilter("issue_type", event.target.value as SportsbookIssueFilter)
                  }
                  value={tableFilters.issue_type}
                >
                  <option value="any">All rows</option>
                  <option value="all-issues">All issues</option>
                  <option value="back-unplaced">Back Unplaced</option>
                  <option value="no-settle-date">No Settle Date</option>
                  <option value="outcome-needed">Outcome Needed</option>
                  <option value="lay-recheck">Lay Recheck</option>
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

      {multiProfileCopySource ? (
        <MultiProfileSportsbookCopyDialog
          onClose={() => setMultiProfileCopySource(null)}
          onComplete={(message) => {
            setMultiProfileCopySource(null);
            setStatusMessage(message);
          }}
          profileId={profileId}
          source={multiProfileCopySource}
        />
      ) : null}

      {outcomeModalState ? (
        <div className="modal-backdrop" onClick={() => setOutcomeModalState(null)}>
          <section
            aria-label="Update sportsbook outcome"
            aria-modal="true"
            className="modal-panel stack"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
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
                    : getSportsbookResultOptions("", "", "")).map((option) => (
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
              <button
                aria-describedby="sportsbook-outcome-validation"
                className="modal-primary-button"
                disabled={Boolean(getSettlementValidationMessage(outcomeModalState.status, outcomeModalState.result, outcomeModalState.date_settled))}
                onClick={() => void submitOutcomeModal()}
                type="button"
              >
                Save
              </button>
            </div>
            <span className="field-help field-span-2" id="sportsbook-outcome-validation" role="status">
              {getSettlementValidationMessage(outcomeModalState.status, outcomeModalState.result, outcomeModalState.date_settled)}
            </span>
          </section>
        </div>
      ) : null}

      {workflowVisible ? (
        <div className="modal-backdrop" onClick={() => void closeEditor()}>
          <section
            aria-label={selectedId ? "Edit sportsbook row" : "Create sportsbook row"}
            aria-modal="true"
            className="content-panel stack workflow-editor-panel modal-panel workflow-editor-modal sportsbook-tabbed-editor-modal"
            data-pd-id="sportsbook.editor.dialog"
            onClick={(event) => event.stopPropagation()}
            ref={editorRef}
            role="dialog"
          >
            <div className="workflow-panel-header workflow-editor-header" data-pd-id="sportsbook.editor.header">
              <div className="stack workflow-editor-title-stack">
                <span className="eyebrow">
                  {selectedId ? "Edit sportsbook row" : "Create sportsbook row"}
                </span>
                <strong className="workflow-header-title" title={editorHeaderFullTitle}>{editorHeaderTitle}</strong>
              </div>
              <section
                aria-label="Sportsbook editor context"
                className="editor-compact-summary"
                data-pd-id="sportsbook.editor.compact-summary"
              >
                <span
                  className="table-chip editor-summary-value-chip"
                  title={`${activeDisplayedValueLabel}: ${formatPreviewFinancialValue(activeDisplayedValue)}`}
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
                    />
                  )}
                </span>
                <span className="table-chip">{formState.status || "Prospecting"}</span>
                {showMatchRatingPill && activeMatchRatingDisplay ? (
                  <span
                    className={`table-chip calculator-match-rating-pill calculator-match-rating-pill-${activeMatchRatingTone ?? "neutral"}`}
                    title={activeMatchRatingInterpretation ?? "Match rating"}
                  >
                    Match {activeMatchRatingDisplay}%
                  </span>
                ) : null}
                <span className={`table-chip${getStrategyToneClass(formState.match_strategy)}`}>
                  {editorMatchStrategyLabel || "Standard"}
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
              </section>
              <div className="tracker-nav workflow-editor-header-actions">
                <div
                  aria-label="Editor tab navigation"
                  className="workflow-editor-header-nav"
                  data-pd-id="sportsbook.editor.tab-actions"
                  role="group"
                >
                  <button
                    className="review-chip review-chip-action-previous"
                    disabled={!previousEditorTab}
                    onClick={() => {
                      if (previousEditorTab) {
                        activateEditorTab(previousEditorTab.id as SportsbookEditorTabId);
                      }
                    }}
                    type="button"
                  >
                    Previous
                  </button>
                  <button
                    className="review-chip review-chip-action-next"
                    disabled={!nextEditorTab}
                    onClick={() => {
                      if (nextEditorTab) {
                        activateEditorTab(nextEditorTab.id as SportsbookEditorTabId);
                      }
                    }}
                    type="button"
                  >
                    Next
                  </button>
                </div>
                <button
                  aria-label="Close sportsbook editor"
                  className="workflow-editor-cancel-button"
                  onClick={() => void closeEditor()}
                  title="Close editor"
                  type="button"
                >
                  <span aria-hidden="true" className="material-symbols-outlined">close</span>
                </button>
              </div>
              <LedgerEditorTabRail
                activeTabId={safeActiveEditorTabId}
                ariaLabel="Sportsbook editor sections"
                guidedTargetTabId={guidedEntryVisible ? guidedEntryTargetTabId : null}
                onActiveTabChange={(tabId) => activateEditorTab(tabId as SportsbookEditorTabId)}
                tabs={editorTabs}
              />
            </div>
            <div className="workflow-editor-body">
          {guidedEntryVisible ? (
            <section
              aria-label="Sportsbook guided entry"
              className={`guided-entry-banner guided-entry-banner-${safeGuidedEntry.state}`}
              data-pd-id="sportsbook.guided-entry"
              key={`${safeGuidedEntry.state}:${safeGuidedEntry.nextRequiredField ?? "none"}:${guidedEntryActionMessage}`}
              role="status"
            >
              <button
                className="guided-entry-action"
                onClick={focusGuidedEntryTarget}
                type="button"
              >
                    <span className="eyebrow">
                      {safeGuidedEntry.state === "review_required" ? "Review required" : "Next required"}
                    </span>
                <strong
                  aria-label={guidedEntryPlainInstruction}
                  id={guidedEntryMessageId}
                >
                  {renderGuidedEntryInstruction()}
                </strong>
              </button>
              <button
                aria-label="Dismiss sportsbook guided entry"
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
              data-pd-id="sportsbook.guided-entry.restore"
              onClick={() => setGuidedEntryDismissed(false)}
              type="button"
            >
              Show guide
            </button>
          ) : null}
          <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
            <LedgerEditorTabPanel activeTabId={safeActiveEditorTabId} tabId="setup">
            <EditorSection
              collapsible={false}
              headerAside={
                renderEditorSectionAside()
              }
              invalid={betSetupValidationActive && missingBetSetupFields.length > 0}
              title="Bet Setup"
            >
              {betSetupValidationActive && missingBetSetupFields.length > 0 ? (
                <EditorValidationBanner
                  dismissKey={betSetupValidationBannerKey}
                  id="sportsbook.editor.bet-setup-validation"
                  message={`Complete these fields before saving: ${missingBetSetupFields.join(", ")}.`}
                  title="Bet setup incomplete"
                />
              ) : null}
              <fieldset className="section-fieldset" disabled={isSettledReadOnly}>
              <div className="form-grid">
                {!formState.sportsbook_bet_id && !selectedId ? (
                  <div className="field-span-2 stack-tight">
	                  <label className="field-control">
                    <span>Common combo (optional)</span>
                    <select
                      aria-label="Apply common bet combo to new sportsbook draft"
                      data-pd-id="sportsbook.editor.common-combo"
                      onChange={(event) => applyCommonBetCombo(event.target.value)}
                      value={formState.source_combo_preset_id}
                    >
                      <option value="">No combo</option>
                      {commonBetCombos.map((combo) => (
                        <option key={combo.preset_id} value={combo.preset_id}>
                          {combo.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {comboBookmakerCandidates.length > 1 ? <div aria-label="Eligible combo bookmakers" className="common-combo-candidate-row" data-pd-id="sportsbook.editor.combo-bookmakers">{comboBookmakerCandidates.map((bookmaker) => <button className={`common-combo-candidate${formState.bookmaker === bookmaker ? " is-selected" : ""}`} key={bookmaker} onClick={() => setFormState((current) => ({ ...current, bookmaker }))} type="button">{bookmaker}</button>)}</div> : null}
                  </div>
                ) : null}
                <label className={getGuidedFieldClass("offer")} {...getGuidedFieldData("offer")}>
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
                    betSetupValidationActive && !formState.bookmaker.trim() ? " is-invalid" : ""
                  }`}
                  {...getGuidedFieldData("bookmaker")}
                >
                  <span>Bookmaker</span>
                  <select
                    aria-describedby={getGuidedDescribedBy("bookmaker")}
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
	                      <span className="eyebrow">Common combo bookmaker coverage</span>
	                      <button
	                        aria-expanded={comboCoverageExpanded}
	                        className="review-chip special-offer-suggestion-toggle"
	                        onClick={() =>
	                          setComboCoveragePreference({
	                            expanded: !comboCoverageExpanded,
	                            key: comboCoverageKey,
	                          })
	                        }
	                        type="button"
	                      >
	                        <span className="table-chip">
	                          {getCompactSportsbookLabel(specialOfferBookmakerSuggestion.resolvedOfferKey)}
	                        </span>
	                        <span
	                          aria-label={`${specialOfferBookmakerSuggestion.availableBookmakers.length} available, ${specialOfferBookmakerSuggestion.unavailableBookmakers.length} unavailable, ${specialOfferBookmakerSuggestion.warningBookmakers.length} warning`}
	                          className="coverage-notification-indicators"
	                        >
	                          {specialOfferBookmakerSuggestion.availableBookmakers.length > 0 ? (
	                            <span className="notification-count notification-count-positive">
	                              {specialOfferBookmakerSuggestion.availableBookmakers.length}
	                            </span>
	                          ) : null}
	                          {specialOfferBookmakerSuggestion.warningBookmakers.length > 0 ? (
	                            <span className="notification-count notification-count-warning">
	                              {specialOfferBookmakerSuggestion.warningBookmakers.length}
	                            </span>
	                          ) : null}
	                          {specialOfferBookmakerSuggestion.unavailableBookmakers.length > 0 ? (
	                            <span className="notification-count notification-count-danger">
	                              {specialOfferBookmakerSuggestion.unavailableBookmakers.length}
	                            </span>
	                          ) : null}
	                        </span>
	                        <span aria-hidden="true" className="material-symbols-outlined">
	                          {comboCoverageExpanded ? "expand_less" : "expand_more"}
	                        </span>
	                      </button>
	                    </div>
	                    {comboCoverageExpanded ? (
	                      <div
	                        aria-label="Known bookmakers for this offer"
	                        className="special-offer-suggestion-groups"
	                        role="group"
	                      >
	                        <div className="review-chip-row" aria-label="Known bookmaker coverage summary">
	                          <span className="review-chip review-chip-action-positive">
	                            Available {specialOfferBookmakerSuggestion.availableBookmakers.length}
	                          </span>
	                          <span className="review-chip review-chip-state-unavailable">
	                            Unavailable {specialOfferBookmakerSuggestion.unavailableBookmakers.length}
	                          </span>
	                          <span className="review-chip review-chip-state-warning">
	                            Warning {specialOfferBookmakerSuggestion.warningBookmakers.length}
	                          </span>
	                          <span className="review-chip review-chip-state-muted">
	                            Missing {specialOfferBookmakerSuggestion.missingKnownBookmakers.length}
	                          </span>
	                        </div>
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
	                        {specialOfferBookmakerSuggestion.warningBookmakers.length > 0 ? (
	                          <div className="special-offer-chip-group">
	                            <span className="field-help-text">Needs attention on this profile</span>
	                            <div className="review-chip-row">
	                              {specialOfferBookmakerSuggestion.warningBookmakers.map((option) =>
	                                option.selectable ? (
	                                  <button
	                                    aria-label={`${option.bookmaker}: ${option.reason}`}
	                                    className="review-chip review-chip-state-warning"
	                                    key={option.bookmaker}
	                                    onClick={() =>
	                                      void applyDropdownChange(
	                                        (current) => ({ ...current, bookmaker: option.bookmaker }),
	                                        "Bookmaker suggestion"
	                                      )
	                                    }
	                                    title={option.reason}
	                                    type="button"
	                                  >
	                                    <span aria-hidden="true" className="material-symbols-outlined">
	                                      warning
	                                    </span>
	                                    {option.bookmaker}
	                                  </button>
	                                ) : (
	                                  <span
	                                    aria-label={`${option.bookmaker}: ${option.reason}`}
	                                    className="review-chip review-chip-state-warning"
	                                    key={option.bookmaker}
	                                    title={option.reason}
	                                  >
	                                    <span aria-hidden="true" className="material-symbols-outlined">
	                                      warning
	                                    </span>
	                                    {option.bookmaker}
	                                  </span>
	                                )
	                              )}
	                            </div>
	                          </div>
	                        ) : null}
	                        {specialOfferBookmakerSuggestion.missingKnownBookmakers.length > 0 ? (
	                          <div className="special-offer-chip-group">
	                            <span className="field-help-text">Not yet linked on this profile</span>
	                            <div className="review-chip-row">
	                              {specialOfferBookmakerSuggestion.missingKnownBookmakers.map((option) => (
	                                <span className="review-chip review-chip-state-info" key={option}>
	                                  <span aria-hidden="true" className="material-symbols-outlined">
	                                    info
	                                  </span>
	                                  {option}
	                                </span>
	                              ))}
	                            </div>
	                          </div>
	                        ) : null}
	                      </div>
	                    ) : null}
	                    {specialOfferBookmakerSuggestion.profileKnownBookmakers.length === 0 ? (
	                      <p className="field-help-text" role="status">
	                        Add one of these bookmakers in Settings before using this offer on this profile.
	                      </p>
	                    ) : null}
	                    {specialOfferBookmakerSuggestion.selectedBookmakerState === "blocked" ? (
	                      <p className="field-validation-text" role="status">
	                        The selected bookmaker is known for this offer but unavailable on this profile.
	                      </p>
	                    ) : null}
	                    {specialOfferBookmakerSuggestion.selectedBookmakerState === "not_signed_up" ? (
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
                    className={`${getGuidedFieldClass("bet_type")}${
                      betSetupValidationActive && !formState.bet_type.trim() ? " is-invalid" : ""
                    }`}
                    {...getGuidedFieldData("bet_type")}
                  >
                  <span>Bet type (bet shape / placement)</span>
                  <select
                    aria-describedby={getGuidedDescribedBy("bet_type")}
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
                    className={`${getGuidedFieldClass("offer_type")}${
                      betSetupValidationActive && !formState.offer_type.trim() ? " is-invalid" : ""
                    }`}
                    {...getGuidedFieldData("offer_type")}
                  >
                  <span>Offer type (promotion mechanism)</span>
                  <select
                    aria-describedby={getGuidedDescribedBy("offer_type")}
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
                  <input
                    maxLength={120}
                    onBlur={() =>
                      void applyDropdownChange((current) => current, "Campaign tag change")
                    }
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, offer_name: event.target.value }))
                    }
                    placeholder="Enter a campaign tag"
                    type="text"
                    value={formState.offer_name}
                  />
                </label>
                  <label
                    className={`${getGuidedFieldClass("fixture_type")}${
                      betSetupValidationActive && !formState.fixture_type.trim() ? " is-invalid" : ""
                    }`}
                    {...getGuidedFieldData("fixture_type")}
                  >
                  <span>Fixture type</span>
                  <select
                    aria-describedby={getGuidedDescribedBy("fixture_type")}
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
                  <div aria-label="Common fixture type shortcuts" className="field-choice-pills">
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
                      betSetupValidationActive && !formState.event_name.trim() ? " is-invalid" : ""
                    }`}
                    {...getGuidedFieldData("event_name")}
                  >
                  <span>Event name</span>
                  <input
                    aria-describedby={getGuidedDescribedBy("event_name")}
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
              </div>
              </fieldset>
            </EditorSection>
            </LedgerEditorTabPanel>

            <LedgerEditorTabPanel activeTabId={safeActiveEditorTabId} tabId="matching">
            <EditorSection
              collapsible={false}
              headerAside={renderEditorSectionAside(
                !isSettledReadOnly && !calculatorUnlocked ? (
                  <span className="section-lock-chip">Complete bet setup</span>
                ) : null
              )}
              invalid={
                (calculatorUnlocked && missingCalculatorFields.length > 0) ||
                (betSetupValidationActive &&
                  placementPlanRequired &&
                  missingPlacementFields.length > 0)
              }
              title="Odds and matching"
            >
              {placementPlanRequired && missingPlacementFields.length > 0 ? (
                <EditorValidationBanner
                  dismissKey={placementValidationBannerKey}
                  id="sportsbook.editor.placement-validation"
                  message={
                    betSetupValidationActive
                      ? `Complete these fields before saving: ${missingPlacementFields.join(", ")}.`
                      : `Save remains blocked until these are filled: ${missingPlacementFields.join(", ")}.`
                  }
                  title={
                    betSetupValidationActive
                      ? "Placed or settled row needs required fields"
                      : "Placement currently incomplete"
                  }
                />
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
                      {calculatorUnlocked &&
                      !isPreviewReady &&
                      missingCalculatorFields.length > 0 ? (
	                        <EditorValidationBanner
	                          dismissKey={calculatorValidationBannerKey}
	                          id="sportsbook.editor.calculator-validation"
	                          message={`Complete these calculator inputs: ${missingCalculatorFields.join(", ")}.`}
	                          title="Calculator inputs incomplete"
	                        />
	                      ) : null}
	                      <div className="ledger-calculator-mode-bar" data-pd-id="sportsbook.matching.calculator-mode">
	                        <label className="field-control ledger-calculator-mode-field">
	                          <span>Calculator Type</span>
	                          <input
	                            aria-label="Sportsbook calculator bet type"
	                            readOnly
	                            value={isFreeBetAwardableRow ? "Qualifying" : formState.offer_type || "Normal"}
	                          />
	                        </label>
	                        <label className="field-control ledger-calculator-mode-field">
	                          <span>Lay mode</span>
	                          <select
	                            aria-label="Sportsbook lay workflow mode"
	                            onChange={(event) =>
	                              applyLayWorkflowMode(event.target.value as LayWorkflowMode)
	                            }
	                            value={layWorkflowMode}
	                          >
                              {sportsbookLayWorkflowModeOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option === "Multilay" ? "Multi Lay" : option}
                                </option>
                              ))}
	                          </select>
	                        </label>
	                      </div>
	                      <div className="form-grid calculator-input-grid">
                        <div className="field-span-2 calculator-segment calculator-segment-back">
                          <div className="calculator-segment-heading">
                            <span className="eyebrow">Back bet</span>
                          </div>
                          <div className="calculator-segment-grid calculator-segment-grid-back">
                            {isProfitBoostOffer ? (
                              <label className="field-control">
                                <span>Bookmaker display</span>
                                <select
                                  onChange={(event) =>
                                    setFormState((current) => ({
                                      ...current,
                                      profit_boost_mode: event.target.value,
                                    }))
                                  }
                                  value={formState.profit_boost_mode}
                                >
                                  <option value="displayed_odds">Boosted odds shown</option>
                                  <option value="percentage">Percentage shown</option>
                                </select>
                              </label>
                            ) : null}
                            <label
                              className={`${getGuidedFieldClass("back_stake")}${
                                calculatorUnlocked && missingCalculatorFields.includes("Back stake")
                                  ? " is-invalid"
                                  : ""
                              }`}
                              {...getGuidedFieldData("back_stake")}
                            >
                              <span>Back stake</span>
                              <input
                                aria-describedby={getGuidedDescribedBy("back_stake")}
	                                aria-invalid={calculatorUnlocked && missingCalculatorFields.includes("Back stake")}
	                                inputMode="decimal"
	                                onChange={(event) => updateDecimalFormField("back_stake", event.target.value)}
	                                value={formState.back_stake}
	                              />
                            </label>
                            {!isProfitBoostOffer || formState.profit_boost_mode === "displayed_odds" ? (
                              <label
                                className={`${getGuidedFieldClass("back_odds")}${
                                  calculatorUnlocked &&
                                  missingCalculatorFields.some((field) =>
                                    field === "Back odds" || field === "Boosted back odds"
                                  )
                                    ? " is-invalid"
                                    : ""
                                }`}
                                {...getGuidedFieldData("back_odds")}
                              >
                                <span>{isProfitBoostOffer ? "Boosted back odds" : "Back odds"}</span>
                                <input
                                  aria-describedby={getGuidedDescribedBy("back_odds")}
                                  aria-invalid={
                                    calculatorUnlocked &&
                                    missingCalculatorFields.some((field) =>
                                      field === "Back odds" || field === "Boosted back odds"
                                    )
                                  }
	                                  inputMode="decimal"
	                                  onChange={(event) => updateDecimalFormField("back_odds", event.target.value)}
	                                  value={formState.back_odds}
	                                />
                              </label>
                            ) : (
                              <>
                                <label
                                  className={`field-control${
                                    missingCalculatorFields.includes("Base back odds")
                                      ? " is-invalid"
                                      : ""
                                  }`}
                                >
                                  <span>Base back odds</span>
                                  <input
	                                    inputMode="decimal"
	                                    onChange={(event) => updateDecimalFormField("base_back_odds", event.target.value)}
	                                    value={formState.base_back_odds}
	                                  />
                                </label>
                                <label
                                  className={`field-control${
                                    missingCalculatorFields.includes("Profit boost %")
                                      ? " is-invalid"
                                      : ""
                                  }`}
                                >
                                  <span>Profit boost %</span>
                                  <input
	                                    inputMode="decimal"
	                                    onChange={(event) => updateDecimalFormField("profit_boost_percent", event.target.value)}
	                                    value={formState.profit_boost_percent}
	                                  />
                                </label>
                                <label className="field-control">
                                  <span>Maximum boost winnings</span>
                                  <input
	                                    inputMode="decimal"
	                                    onChange={(event) => updateDecimalFormField("maximum_boost_winnings", event.target.value)}
	                                    value={formState.maximum_boost_winnings}
	                                  />
                                </label>
                              </>
                            )}
                            {isProfitBoostOffer ? (
                              <label className="field-control">
                                <span>Actual accepted back odds</span>
                                <input
	                                  inputMode="decimal"
	                                  onChange={(event) => updateDecimalFormField("actual_accepted_back_odds", event.target.value)}
	                                  value={formState.actual_accepted_back_odds}
	                                />
                              </label>
                            ) : null}
                            {isProfitBoostOffer && previewCalculation?.effective_back_odds ? (
                              <div className="field-control" role="status">
                                <span>Effective boosted odds</span>
                                <strong>{previewCalculation.effective_back_odds}</strong>
                                <small>
                                  {previewCalculation.profit_boost_source === "calculated"
                                    ? "Reference calculation"
                                    : previewCalculation.profit_boost_source === "accepted"
                                      ? "Accepted by bookmaker"
                                      : "Displayed by bookmaker"}
                                </small>
                              </div>
                            ) : null}
                          </div>
                          <div className="review-chip-row" role="group" aria-label="Back placement actions">
                            <button
                              aria-pressed={backPlacementConfirmed}
                              className="review-chip review-chip-action-placement"
                              disabled={!backPlacementReady || backPlacementConfirmed}
                              onClick={() => applyPlacementAction("back-placed")}
                              type="button"
                            >
                              Back Bet Placed
                            </button>
                            {backPlacementConfirmed && !isSettledReadOnly && !pendingBackPlacementRevert ? (
                              <button
                                aria-label="Revert back bet placement"
                                className="icon-button"
                                data-pd-id="sportsbook.placement.revert-back"
                                onClick={requestRevertBackPlacement}
                                title="Revert back bet placement"
                                type="button"
                              >
                                <span aria-hidden="true" className="material-symbols-outlined">undo</span>
                              </button>
                            ) : null}
                            {pendingBackPlacementRevert ? (
                              <>
                                <button
                                  className="review-chip review-chip-danger"
                                  onClick={revertBackPlacement}
                                  type="button"
                                >
                                  Remove Back Placement
                                </button>
                                <button
                                  className="review-chip review-chip-action-previous"
                                  onClick={() => setPendingBackPlacementRevert(false)}
                                  type="button"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : null}
                          </div>
                          {pendingBackPlacementRevert ? (
                            <p className="placement-confirmation-text" role="alert">
                              Are you sure? back bet has been recorded.
                            </p>
                          ) : null}
                          {backPlacementConfirmed && !formState.date_settled.trim() ? (
                            <div className="placement-settlement-inline">
                              <label className="field-control" {...getGuidedFieldData("settlement")}>
                                <span>Settles</span>
                                <input
                                  aria-invalid={betSetupValidationActive && missingPlacementFields.includes("Settles")}
                                  onChange={(event) =>
                                    setFormState((current) => ({
                                      ...current,
                                      date_settled: event.target.value,
                                      status: current.status === "Prospecting" ? "Placed" : current.status,
                                      result: current.result || "Pending",
                                    }))
                                  }
                                  type="datetime-local"
                                  value={formState.date_settled}
                                />
                              </label>
                              {formState.fixture_type === "Football" ? (
                                <button
                                  aria-label="Add 90 minutes to football settlement time"
                                  className="review-chip review-chip-action-previous placement-settlement-assist"
                                  disabled={!canUseFootballSettlesAssist || footballSettlesAssistUsed}
                                  onClick={applyFootballSettlesAssist}
                                  title="Add 90 minutes to football settlement time"
                                  type="button"
                                >
                                  <span aria-hidden="true" className="material-symbols-outlined">timer</span>
                                  <span>+90m</span>
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>

                        {!isNoLayStrategy && !usesMultiLayStrategy ? (
                        <div className="field-span-2 calculator-segment calculator-segment-lay">
                          <div className="calculator-segment-heading">
                            <span className="eyebrow">Lay / exchange</span>
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
                            {!isNoLayStrategy ? (
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
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ) : null}
                            {!isNoLayStrategy && !usesMultiLayStrategy ? (
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
	                                  inputMode="decimal"
	                                  onChange={(event) => updateDecimalFormField("lay_odds_1", event.target.value)}
	                                  value={formState.lay_odds_1}
	                                />
                              </label>
                            ) : null}
                            {!isNoLayStrategy && !usesMultiLayStrategy ? (
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
	                                  inputMode="decimal"
	                                  onChange={(event) => updateDecimalFormField("lay_actual", event.target.value)}
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
	                                  inputMode="decimal"
	                                  onChange={(event) => updateDecimalFormField("maximum_bonus", event.target.value)}
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
	                                  inputMode="decimal"
	                                  onChange={(event) => updateDecimalFormField("bonus_retention_rate", event.target.value)}
	                                  value={formState.bonus_retention_rate}
	                                />
                              </label>
                            ) : null}
                          </div>

                          {!isNoLayStrategy && !usesMultiLayStrategy ? (
                            <>
                              <div className="review-chip-row" role="group" aria-label="Lay placement actions">
                                <button
                                  aria-pressed={layPartiallyConfirmed}
                                  className="review-chip review-chip-action-negative"
                                  disabled={!layPlacementReady || layPlacementConfirmed}
                                  onClick={() => addPartialLayLeg({ isFinal: false })}
                                  type="button"
                                >
                                  Lay Placed but Partially Matched
                                </button>
                                <button
                                  aria-pressed={layFullyConfirmed}
                                  className="review-chip review-chip-action-positive"
                                  disabled={!layPlacementReady || layFullyConfirmed}
                                  onClick={() => addPartialLayLeg({ isFinal: true })}
                                  type="button"
                                >
                                  Lay Fully Placed
                                </button>
                                {layPlacementConfirmed && !isSettledReadOnly && !pendingLayPlacementRevert ? (
                                  <button
                                    aria-label="Revert lay placement"
                                    className="icon-button"
                                    data-pd-id="sportsbook.placement.revert-lay"
                                    onClick={requestRevertLayPlacement}
                                    title="Revert lay placement"
                                    type="button"
                                  >
                                    <span aria-hidden="true" className="material-symbols-outlined">
                                      undo
                                    </span>
                                  </button>
                                ) : null}
                                {pendingLayPlacementRevert ? (
                                  <>
                                    <button
                                      className="review-chip review-chip-danger"
                                      onClick={revertLayPlacement}
                                      type="button"
                                    >
                                      Remove Lay
                                    </button>
                                    <button
                                      className="review-chip review-chip-action-previous"
                                      onClick={() => setPendingLayPlacementRevert(false)}
                                      type="button"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : null}
                              </div>
                              {pendingLayPlacementRevert ? (
                                <p className="placement-confirmation-text" role="alert">
                                  Are you sure? lay has been entered.
                                </p>
                              ) : null}
                            </>
                          ) : null}
                          {!isNoLayStrategy && !usesMultiLayStrategy ? (
                            <p className="field-help-text">
                              Confirm lay execution from these actions as each leg is matched.
                            </p>
                          ) : null}
                        </div>
                        ) : null}

                        {shouldShowLayPlacementLegDetails ? (
	                          <div className="field-span-2 content-subpanel stack partial-lay-panel" aria-label={partialLayPanelTitle}>
	                            <div className="section-heading-row">
	                              <span className="eyebrow">{partialLayPanelTitle}</span>
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
	                                        {partialLayLegs.length > 1 && index > 0 ? (
	                                          <button
	                                            aria-label={leg.isFinal ? "Remove final lay leg" : "Remove lay leg"}
	                                            className="icon-button icon-button-destructive table-action-button"
	                                            onClick={() => requestRemovePartialLayLeg(leg.id)}
	                                            title={leg.isFinal ? "Remove final lay leg" : "Remove lay leg"}
	                                            type="button"
	                                          >
	                                            <span
	                                              aria-hidden="true"
	                                              className="material-symbols-outlined"
	                                            >
	                                              delete
	                                            </span>
	                                          </button>
	                                        ) : null}
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
	                                <strong>{formatPreviewFinancialValue(partialLayExecutionSummary.matchedTotal)}</strong>
	                              </p>
                              <p className="lede">
                                <span className="summary-label">Target Lay</span>
                                <strong>
	                                  {partialLayExecutionSummary.targetLayStake === null
	                                    ? "—"
	                                    : formatPreviewFinancialValue(partialLayExecutionSummary.targetLayStake)}
	                                </strong>
	                              </p>
                              <p className="lede">
                                <span className="summary-label">Remaining to Match</span>
                                <strong>
	                                  {partialLayExecutionSummary.remainingToMatch === null
	                                    ? "—"
	                                    : formatPreviewFinancialValue(partialLayExecutionSummary.remainingToMatch)}
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
	                          <div className="calculator-panel-card calculator-result-panel">
	                            {layStakePreview ? (
	                              <div
	                                className={`calculator-result-card-grid calculator-result-card-grid-${singleLayCalculatorMode.toLowerCase()}`}
	                                data-pd-id="sportsbook.matching.result-cards"
	                              >
	                                {singleLayResultCards.map((card) => (
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
	                                        <dd>{formatPreviewFinancialValue(card.layStake)}</dd>
	                                      </div>
	                                      <div>
	                                        <dt>Liability</dt>
	                                        <dd>{formatPreviewFinancialValue(card.liability)}</dd>
	                                      </div>
	                                      <div>
	                                        <dt>Back Win</dt>
	                                        <dd>{renderPreviewFinancialValue(card.backWin)}</dd>
	                                      </div>
	                                      <div>
	                                        <dt>Lay Win</dt>
	                                        <dd>{renderPreviewFinancialValue(card.layWin)}</dd>
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
	                                                  setCustomSliderMin(event.target.value);
	                                                }
	                                              }}
	                                              step="0.01"
	                                              type="number"
	                                              value={customSliderMin || formatPreviewMoney(customSliderEffectiveMin)}
	                                            />
	                                          </label>
	                                          <div className="custom-slider-track-wrap">
	                                            <input
	                                              aria-label="Custom lay stake slider"
	                                              aria-valuemax={customSliderBoundedMax}
	                                              aria-valuemin={customSliderEffectiveMin}
	                                              aria-valuenow={customSliderCurrentFloat}
	                                              className="custom-slider-track"
	                                              max={customSliderBoundedMax}
	                                              min={customSliderEffectiveMin}
	                                              onBlur={(event) => commitCustomSliderValue(event.target.value)}
	                                              onChange={(event) => {
	                                                setCustomSliderDraftValue(
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
	                                                  commitCustomSliderValue(event.currentTarget.value);
	                                                }
	                                              }}
	                                              onPointerUp={(event) =>
	                                                commitCustomSliderValue(event.currentTarget.value)
	                                              }
	                                              step="0.01"
	                                              type="range"
	                                              value={customSliderCurrentFloat}
	                                            />
	                                          </div>
	                                          <label className="field-control custom-slider-range-label">
	                                            <span>Max</span>
	                                            <input
	                                              inputMode="decimal"
	                                              min="0.01"
	                                              onChange={(event) => {
	                                                if (isDecimalCalculatorInput(event.target.value)) {
	                                                  setCustomSliderMax(event.target.value);
	                                                }
	                                              }}
	                                              step="0.01"
	                                              type="number"
	                                              value={customSliderMax || formatPreviewMoney(customSliderBoundedMax)}
	                                            />
	                                          </label>
	                                        </div>
	                                      </div>
	                                    ) : null}
	                                    <button
	                                      className="review-chip review-chip-copy calculator-result-copy"
	                                      disabled={!card.canCopy || layFullyConfirmed}
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
	                              <p className="lede">{calculatorGuidance}</p>
	                            )}
	                            {calculatorCopyFeedback ? (
	                              <p className="calculator-copy-feedback" role="status">
	                                <span aria-hidden="true" className="material-symbols-outlined">
	                                  check_circle
	                                </span>
	                                <span>{calculatorCopyFeedback}</span>
	                              </p>
	                            ) : null}
	                          </div>
	                        ) : null}
                      </div>
                    ) : (
                      <div className="calculator-band calculator-band-primary calculator-band-single calculator-band-multilay">
                        <div className="calculator-panel-card calculator-panel-card-multilay">
                          <div className="multi-lay-calculator-title-row">
                            <span className="eyebrow">Multi-Lay Calculator</span>
                          </div>
                          <div className="stack">
                            <div className="multi-lay-planner-toolbar">
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
                              <span
                                className={`table-chip${
                                  visibleMultiLayPlacementStatus === "Fully Laid"
                                    ? " table-chip-lay-full"
                                    : visibleMultiLayPlacementStatus === "Part Laid"
                                      ? " table-chip-lay-partial"
                                      : ""
                                }`}
                              >
                                {visibleMultiLayPlacementStatus}
                              </span>
                            </div>
                            <div
                              aria-describedby={getGuidedDescribedBy("multi_lay_outcomes")}
                              className={`multi-lay-grid-wrap${
                                guidedEntryVisible && guidedEntry.nextRequiredField === "multi_lay_outcomes"
                                  ? " is-guided-next"
                                  : ""
                              }`}
                            >
                              <div className="multi-lay-table-heading">Outcome Table</div>
                              <table className="data-table multi-lay-planner-grid">
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>Outcome</th>
                                    <th>Exchange</th>
                                    <th>Odds</th>
                                    <th>
                                      <span className="multi-lay-column-label">
                                        {formState.match_strategy === "Multilay-Underlay"
                                          ? "Underlay Stake"
                                          : "Lay Stake"}
                                      </span>
                                    </th>
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
                                            updatePrimaryMultiLayOutcomeLabel(event.target.value)
                                          }
                                          maxLength={20}
                                          value={multiLayOutcome1Label}
                                        />
                                      </label>
                                    </td>
                                    <td>
                                      <label className={`${getGuidedFieldClass("exchange")} multi-lay-branch-exchange`}>
                                        <span className="sr-only">Outcome 1 exchange</span>
                                        <select
                                          aria-describedby={getGuidedDescribedBy("exchange")}
                                          onChange={(event) =>
                                            updateMultiLayPlacementField("outcome1", "placedExchange", event.target.value)
                                          }
                                          value={multiLayPrimaryPlacement.placedExchange || formState.exchange_name}
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
                                    <td>
                                      <div className="multi-lay-stake-cell">
                                        {multiLayPrimaryPartialOpen ? (
                                          <div className="multi-lay-partial-edit">
                                            <label className="field-control multi-lay-partial-input">
                                              <span className="sr-only">Outcome 1 currently matched lay stake</span>
                                              <input
                                                inputMode="decimal"
                                                onChange={(event) => {
                                                  updateMultiLayPlacementField(
                                                    "outcome1",
                                                    "placedMatchedStake",
                                                    event.target.value
                                                  );
                                                  updateMultiLayPlacementField(
                                                    "outcome1",
                                                    "placementState",
                                                    parseNumericInput(event.target.value) !== null ? "placed" : "pending"
                                                  );
                                                }}
                                                value={multiLayPrimaryPlacement.placedMatchedStake}
                                              />
                                            </label>
                                            <button
                                              aria-label="Reset outcome 1 partial lay to calculated stake"
                                              className="icon-button multi-lay-partial-reset"
                                              onClick={() => resetMultiLayPartialEntry("outcome1", multiLayPrimaryEffectiveStake)}
                                              title="Reset partial lay"
                                              type="button"
                                            >
                                              <span aria-hidden="true" className="material-symbols-outlined">
                                                restart_alt
                                              </span>
                                            </button>
                                          </div>
                                        ) : (
                                          renderNeutralPreviewFinancialValue(multiLayPrimaryEffectiveStake)
                                        )}
                                        <label className="multi-lay-partial-control">
                                          <input
                                            checked={multiLayPrimaryPartialOpen}
                                            onChange={(event) => {
                                              setMultiLayPartialEntry(
                                                "outcome1",
                                                event.target.checked,
                                                multiLayPrimaryEffectiveStake
                                              );
                                            }}
                                            type="checkbox"
                                          />
                                          <span>Partial</span>
                                        </label>
                                      </div>
                                    </td>
                                    <td>
                                      {renderNeutralPreviewFinancialValue(multiLayPrimaryLeg?.liability)}
                                    </td>
                                    <td>
                                      <div className="multi-lay-row-actions">
                                        <button
                                          aria-label="Copy lay for outcome 1 and mark placed"
                                          className="icon-button multi-lay-action-button"
                                          disabled={!multiLayPrimaryLeg}
                                          onClick={() => {
                                            if (multiLayPrimaryLeg) {
                                              void copyMultiLayStake(multiLayPrimaryLeg);
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
                                    const effectiveStake = leg
                                      ? getEffectiveMultiLayStakeForLeg(formState.match_strategy, leg)
                                      : undefined;
                                    const partialEntryOpen = isMultiLayPartialEntryOpen(
                                      outcome.id,
                                      outcome.placedMatchedStake || "",
                                      effectiveStake
                                    );
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
                                          <label className={`${getGuidedFieldClass("exchange")} multi-lay-branch-exchange`}>
                                            <span className="sr-only">{`Outcome ${index + 2} exchange`}</span>
                                            <select
                                              aria-describedby={getGuidedDescribedBy("exchange")}
                                              onChange={(event) =>
                                                setMultiLayOutcomes((current) =>
                                                  current.map((entry) =>
                                                    entry.id === outcome.id
                                                      ? { ...entry, placedExchange: event.target.value }
                                                      : entry
                                                  )
                                                )
                                              }
                                              value={outcome.placedExchange || formState.exchange_name}
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
                                        <td>
                                          <div className="multi-lay-stake-cell">
                                            {partialEntryOpen ? (
                                              <div className="multi-lay-partial-edit">
                                                <label className="field-control multi-lay-partial-input">
                                                  <span className="sr-only">{`Outcome ${index + 2} currently matched lay stake`}</span>
                                                  <input
                                                    inputMode="decimal"
                                                    onChange={(event) =>
                                                      setMultiLayOutcomes((current) =>
                                                        current.map((entry) =>
                                                          entry.id === outcome.id
                                                            ? {
                                                                ...entry,
                                                                placedMatchedStake: event.target.value,
                                                                placementState:
                                                                  parseNumericInput(event.target.value) !== null
                                                                    ? "placed"
                                                                    : "pending",
                                                              }
                                                            : entry
                                                        )
                                                      )
                                                    }
                                                    value={outcome.placedMatchedStake || ""}
                                                  />
                                                </label>
                                                <button
                                                  aria-label={`Reset ${outcome.label || `outcome ${index + 2}`} partial lay to calculated stake`}
                                                  className="icon-button multi-lay-partial-reset"
                                                  onClick={() => resetMultiLayPartialEntry(outcome.id, effectiveStake)}
                                                  title="Reset partial lay"
                                                  type="button"
                                                >
                                                  <span aria-hidden="true" className="material-symbols-outlined">
                                                    restart_alt
                                                  </span>
                                                </button>
                                              </div>
                                            ) : (
                                              renderNeutralPreviewFinancialValue(effectiveStake)
                                            )}
                                            <label className="multi-lay-partial-control">
                                              <input
                                                checked={partialEntryOpen}
                                                onChange={(event) =>
                                                  setMultiLayPartialEntry(
                                                    outcome.id,
                                                    event.target.checked,
                                                    effectiveStake
                                                  )
                                                }
                                                type="checkbox"
                                              />
                                              <span>Partial</span>
                                            </label>
                                          </div>
                                        </td>
                                        <td>{renderNeutralPreviewFinancialValue(leg?.liability)}</td>
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
                            <div className="tracker-nav multi-lay-add-row">
                              <button className="button-link" onClick={addMultiLayOutcome} type="button">
                                Add outcome
                              </button>
                            </div>
                          </div>
                          {multiLayPlannerSummary ? (
                            <div className="stack">
                              <div className="multi-lay-grid-wrap">
                                <div className="multi-lay-table-heading">Result Table</div>
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
                                        <td>{renderPreviewFinancialValue(row.bookmakerValue)}</td>
                                        {multiLayPlannerSummary.legs.map((leg) => (
                                          <td key={`${row.key}-${leg.key}`}>
                                            {renderPreviewFinancialValue(row.branchValues[leg.key])}
                                          </td>
                                        ))}
                                        <td>{renderPreviewFinancialValue(row.profit)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr>
                                      <td colSpan={multiLayPlannerSummary.legs.length + 3}>
                                        <span className="multi-lay-heading-values">
                                          Liability {renderNeutralPreviewFinancialValue(multiLayPlannerSummary.totalLiability)}
                                          <span aria-hidden="true"> · </span>
                                          Current {renderPreviewFinancialValue(multiLayPlannerSummary.currentValue)}
                                        </span>
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
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
            </LedgerEditorTabPanel>

            {showsPlacementSection ? (
              <LedgerEditorTabPanel activeTabId={safeActiveEditorTabId} tabId="placement">
              <EditorSection
                collapsible={false}
                headerAside={
                  renderEditorSectionAside()
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
                    <div
                      aria-describedby={getGuidedDescribedBy("multi_lay_placements")}
                      className={`multi-lay-grid-wrap${
                        guidedEntryVisible && guidedEntry.nextRequiredField === "multi_lay_placements"
                          ? " is-guided-next"
                          : ""
                      }`}
                    >
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
                {selectedSportsbookRow &&
                (selectedSportsbookRow.lay_status === "Part Laid" ||
                  selectedSportsbookRow.partial_lay_reminder_state === "Active") ? (
                  <section
                    aria-label="Partial-lay follow-up reminder"
                    className="stack"
                    data-pd-id="sportsbook.partial-lay-reminder.summary"
                  >
                    <div className="section-heading-row">
                      <span className="eyebrow">Lay follow-up</span>
                      <span
                        className={`table-chip${
                          selectedSportsbookRow.partial_lay_reminder_state === "Active"
                            ? " table-chip-lay-partial"
                            : ""
                        }`}
                      >
                        {selectedSportsbookRow.partial_lay_reminder_state}
                      </span>
                    </div>
                    {selectedSportsbookRow.partial_lay_reminder_state === "Active" ? (
                      <div className="summary-list">
                        <p className="lede">
                          <span className="summary-label">Due</span>
                          <strong>
                            {formatEditorSettlesDate(
                              selectedSportsbookRow.partial_lay_reminder_due_at
                            )}
                          </strong>
                        </p>
                        <p className="lede">
                          <span className="summary-label">Reason</span>
                          <span>{selectedSportsbookRow.partial_lay_reminder_reason}</span>
                        </p>
                      </div>
                    ) : null}
                    <div className="tracker-nav">
                      <button
                        aria-label={
                          selectedSportsbookRow.partial_lay_reminder_state === "Active"
                            ? "Review partial-lay reminder"
                            : selectedSportsbookRow.partial_lay_reminder_state === "Not Set"
                              ? "Set partial-lay reminder"
                              : "Set new partial-lay reminder"
                        }
                        className="button-link icon-text-action"
                        data-pd-id="sportsbook.partial-lay-reminder.open"
                        onClick={() => openPartialLayReminderEditor(selectedSportsbookRow)}
                        type="button"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined">
                          {selectedSportsbookRow.partial_lay_reminder_state === "Active"
                            ? "notifications_active"
                            : "notification_add"}
                        </span>
                        {selectedSportsbookRow.partial_lay_reminder_state === "Active"
                          ? "Review Reminder"
                          : selectedSportsbookRow.partial_lay_reminder_state === "Not Set"
                            ? "Set Reminder"
                            : "Set New Reminder"}
                      </button>
                    </div>
                    {partialLayReminderEditorState?.rowId ===
                    selectedSportsbookRow.sportsbook_bet_id ? (
                      <div
                        aria-label="Partial-lay reminder controls"
                        className="stack partial-lay-reminder-editor"
                        data-pd-id="sportsbook.partial-lay-reminder.inline-editor"
                      >
                        <div className="form-grid">
                          <label className="field-control">
                            <span>Recheck due</span>
                            <input
                              data-pd-id="sportsbook.partial-lay-reminder.due"
                              disabled={isPartialLayReminderSaving}
                              onChange={(event) =>
                                setPartialLayReminderEditorState((current) =>
                                  current ? { ...current, due_at: event.target.value } : current
                                )
                              }
                              type="datetime-local"
                              value={partialLayReminderEditorState.due_at}
                            />
                          </label>
                          <label className="field-control">
                            <span>Reason (optional)</span>
                            <input
                              data-pd-id="sportsbook.partial-lay-reminder.reason"
                              disabled={isPartialLayReminderSaving}
                              onChange={(event) =>
                                setPartialLayReminderEditorState((current) =>
                                  current ? { ...current, reason: event.target.value } : current
                                )
                              }
                              value={partialLayReminderEditorState.reason}
                            />
                          </label>
                          {partialLayReminderEditorState.wasActive ? (
                            <label className="field-control field-span-2">
                              <span>Resolution or dismissal note</span>
                              <textarea
                                data-pd-id="sportsbook.partial-lay-reminder.resolution-note"
                                disabled={isPartialLayReminderSaving}
                                onChange={(event) =>
                                  setPartialLayReminderEditorState((current) =>
                                    current
                                      ? { ...current, resolution_note: event.target.value }
                                      : current
                                  )
                                }
                                rows={3}
                                value={partialLayReminderEditorState.resolution_note}
                              />
                            </label>
                          ) : null}
                        </div>
                        <div className="tracker-nav">
                          <button
                            className="button-link"
                            disabled={isPartialLayReminderSaving}
                            onClick={() => setPartialLayReminderEditorState(null)}
                            type="button"
                          >
                            Close
                          </button>
                          {partialLayReminderEditorState.wasActive ? (
                            <>
                              <button
                                className="review-chip review-chip-danger tracker-nav-right-action"
                                disabled={
                                  isPartialLayReminderSaving ||
                                  !partialLayReminderEditorState.resolution_note.trim()
                                }
                                onClick={() => void submitPartialLayReminder("Dismissed")}
                                type="button"
                              >
                                Dismiss
                              </button>
                              <button
                                className="modal-primary-button"
                                disabled={
                                  isPartialLayReminderSaving ||
                                  !partialLayReminderEditorState.resolution_note.trim()
                                }
                                onClick={() => void submitPartialLayReminder("Resolved")}
                                type="button"
                              >
                                Resolve
                              </button>
                            </>
                          ) : (
                            <button
                              className="modal-primary-button tracker-nav-right-action"
                              disabled={
                                isPartialLayReminderSaving ||
                                !partialLayReminderEditorState.due_at.trim()
                              }
                              onClick={() => void submitPartialLayReminder("Active")}
                              type="button"
                            >
                              {selectedSportsbookRow.partial_lay_reminder_state === "Not Set"
                                ? "Save Reminder"
                                : "Save New Reminder"}
                            </button>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </section>
                ) : null}
              </EditorSection>
              </LedgerEditorTabPanel>
            ) : null}

            <LedgerEditorTabPanel activeTabId={safeActiveEditorTabId} tabId="settlement">
            <EditorSection
              collapsible={false}
              defaultOpen={Boolean(selectedId)}
              headerAside={renderEditorSectionAside()}
              key={selectedId ?? "sportsbook-settlement-new"}
              title="Settlement"
            >
              <fieldset className="section-fieldset" disabled={isSettledReadOnly}>
                <div className="form-grid">
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
                  <label className="field-control" {...getGuidedFieldData("settlement")}>
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
                  {quickSettlementOptions.length > 0 ? (
                    <div
                      aria-label="Quick settlement outcomes"
                      className="settlement-quick-actions field-span-2"
                      role="group"
                    >
                      {quickSettlementOptions.map((option) => (
                        <button
                          className={`review-chip settlement-quick-action${
                            formState.result === option.value ? " is-active" : ""
                          }`}
                          key={option.value}
                          onClick={() =>
                            void applyDropdownChange(
                              (current) => applyResultDefaults(current, option.value),
                              "Settlement quick action"
                            )
                          }
                          type="button"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {isPreviewReady && activePreviewCalculation ? (
                    <section
                      aria-label={
                        settlementHasFinalOutcome
                          ? "Final settlement value"
                          : "Potential settlement outcomes"
                      }
                      className={`settlement-outcome-panel field-span-2${
                        settlementHasFinalOutcome ? " settlement-outcome-panel-final" : ""
                      }`}
                      data-pd-id="sportsbook.settlement.outcomes"
                    >
                      <div className="settlement-outcome-primary">
                        <span className="eyebrow">
                          {settlementHasFinalOutcome ? "Final value" : "Current value"}
                        </span>
                        <strong>{renderPreviewFinancialValue(settlementPrimaryValue)}</strong>
                      </div>
                      {settlementHasFinalOutcome ? (
                        <div className="settlement-outcome-status">
                          <span className="summary-label">Outcome</span>
                          <strong>{formState.result}</strong>
                        </div>
                      ) : usesMultiLayStrategy && multiLayPlannerSummary ? (
                        <div className="settlement-outcome-grid" aria-label="Potential multi-lay outcomes">
                          {multiLayResultsGridRows.map((row) => (
                            <div className="settlement-outcome-card" key={row.key}>
                              <span className="summary-label">{row.outcomeLabel}</span>
                              <strong>{renderPreviewFinancialValue(row.profit)}</strong>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="settlement-outcome-grid" aria-label="Potential outcomes">
                          <div className="settlement-outcome-card">
                            <span className="summary-label">
                              {getScenarioBranchText(
                                scenarioBranchLabels.backWinLabel,
                                formState.result
                              )}
                            </span>
                            <strong>
                              {renderPreviewFinancialValue(
                                activePreviewCalculation.scenario_pnl_if_back_wins
                              )}
                            </strong>
                          </div>
                          <div className="settlement-outcome-card">
                            <span className="summary-label">
                              {getScenarioBranchText(
                                scenarioBranchLabels.layWinLabel,
                                formState.result
                              )}
                            </span>
                            <strong>
                              {renderPreviewFinancialValue(
                                activePreviewCalculation.scenario_pnl_if_lay_wins
                              )}
                            </strong>
                          </div>
                          {scenarioBranchLabels.outcome2Label &&
                          activePreviewCalculation.scenario_pnl_if_outcome_2_wins !== null ? (
                            <div className="settlement-outcome-card">
                              <span className="summary-label">
                                {getScenarioBranchText(
                                  scenarioBranchLabels.outcome2Label,
                                  formState.result
                                )}
                              </span>
                              <strong>
                                {renderPreviewFinancialValue(
                                  activePreviewCalculation.scenario_pnl_if_outcome_2_wins
                                )}
                              </strong>
                            </div>
                          ) : null}
                          {scenarioBranchLabels.outcome3Label &&
                          activePreviewCalculation.scenario_pnl_if_outcome_3_wins !== null ? (
                            <div className="settlement-outcome-card">
                              <span className="summary-label">
                                {getScenarioBranchText(
                                  scenarioBranchLabels.outcome3Label,
                                  formState.result
                                )}
                              </span>
                              <strong>
                                {renderPreviewFinancialValue(
                                  activePreviewCalculation.scenario_pnl_if_outcome_3_wins
                                )}
                              </strong>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </section>
                  ) : null}
                  {settlementReviewRule ? (
                    <label className="field-control field-span-2">
                      <span>Settlement review</span>
                      <input readOnly value={settlementReviewRule} />
                    </label>
                  ) : null}
                </div>
                <details className="settlement-advanced-controls field-span-2">
                  <summary>Advanced controls</summary>
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
                </details>
              </fieldset>
            </EditorSection>
            </LedgerEditorTabPanel>
            <LedgerEditorTabPanel activeTabId={safeActiveEditorTabId} tabId="free_bet">
              <EditorSection
                collapsible={false}
                defaultOpen
                headerAside={renderEditorSectionAside()}
                key={`${selectedId ?? "sportsbook-free-bet-new"}-bridge`}
                title="Free-Bet Bridge"
              >
                {!canUseFreeBetBridge ? (
                  <div className="empty-state compact-empty-state" data-pd-id="sportsbook.free-bet-bridge.locked">
                    {isFreeBetAwardableRow
                      ? "Save this sportsbook row before creating free-bet award rows."
                      : "This sportsbook workflow does not create a free bet."}
                  </div>
                ) : freeBetBridgeModalState ? (
                  <div
                    className="free-bet-bridge-inline form-grid"
                    data-guided-field="free_bet_bridge"
                    data-pd-id="sportsbook.free-bet-bridge.inline"
                  >
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
                      <span>Campaign tag</span>
                      <select
                        onChange={(event) =>
                          setFreeBetBridgeModalState((current) =>
                            current
                              ? {
                                  ...current,
                                  offer_name: event.target.value,
                                  splits: current.splits.map((split, index) =>
                                    index === 0 ? { ...split, offer_name: event.target.value } : split
                                  ),
                                }
                              : current
                          )
                        }
                        value={freeBetBridgeModalState.offer_name}
                      >
                        {freeBetBridgeOfferNameOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field-control">
                      <span>Bet type</span>
                      <select
                        onChange={(event) =>
                          setFreeBetBridgeModalState((current) =>
                            current
                              ? {
                                  ...current,
                                  bet_type: event.target.value,
                                  splits: current.splits.map((split, index) =>
                                    index === 0 ? { ...split, bet_type: event.target.value } : split
                                  ),
                                }
                              : current
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
                            current
                              ? {
                                  ...current,
                                  fixture_type: event.target.value,
                                  splits: current.splits.map((split, index) =>
                                    index === 0 ? { ...split, fixture_type: event.target.value } : split
                                  ),
                                }
                              : current
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
                    <label className="field-control">
                      <span>Status</span>
                      <select
                        onChange={(event) =>
                          setFreeBetBridgeModalState((current) =>
                            current ? { ...current, free_bet_status: event.target.value } : current
                          )
                        }
                        value={freeBetBridgeModalState.free_bet_status}
                      >
                        {freeBetStatusOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field-control">
                      <span>Free-bet value</span>
                      <input
                        inputMode="decimal"
                        onChange={(event) =>
                          setFreeBetBridgeModalState((current) =>
                            current
                              ? {
                                  ...current,
                                  free_bet_value: event.target.value,
                                  expected_award_value: event.target.value,
                                  splits: current.splits.map((split, index) =>
                                    index === 0 ? { ...split, free_bet_value: event.target.value } : split
                                  ),
                                }
                              : current
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
                            current
                              ? {
                                  ...current,
                                  expiry_datetime: event.target.value,
                                  splits: current.splits.map((split, index) =>
                                    index === 0 ? { ...split, expiry_datetime: event.target.value } : split
                                  ),
                                }
                              : current
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
                            current
                              ? {
                                  ...current,
                                  retention_mode: event.target.value,
                                  splits: current.splits.map((split, index) =>
                                    index === 0 ? { ...split, retention_mode: event.target.value } : split
                                  ),
                                }
                              : current
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
                      <span>Expected award value</span>
                      <input
                        inputMode="decimal"
                        onChange={(event) =>
                          setFreeBetBridgeModalState((current) =>
                            current ? { ...current, expected_award_value: event.target.value } : current
                          )
                        }
                        value={freeBetBridgeModalState.expected_award_value}
                      />
                    </label>
                    <label className="field-control field-span-2">
                      <span>Notes</span>
                      <textarea
                        maxLength={1000}
                        onChange={(event) =>
                          setFreeBetBridgeModalState((current) =>
                            current ? { ...current, user_notes: event.target.value } : current
                          )
                        }
                        rows={3}
                        value={freeBetBridgeModalState.user_notes}
                      />
                    </label>
                    {hasFreeBetBridgeVariance(freeBetBridgeModalState) ? (
                      <label className="field-control field-span-2">
                        <span>Split variance reason</span>
                        <input
                          maxLength={500}
                          onChange={(event) =>
                            setFreeBetBridgeModalState((current) =>
                              current ? { ...current, variance_reason: event.target.value } : current
                            )
                          }
                          placeholder="Example: award split into football and racing free bets"
                          value={freeBetBridgeModalState.variance_reason}
                        />
                      </label>
                    ) : null}
                    <div className="field-span-2 bridge-split-panel stack" data-pd-id="sportsbook.free-bet-bridge.splits">
                      <div className="bridge-split-panel-header">
                        <div className="stack">
                          <strong>Free-bet awards</strong>
                          <span className="field-help">
                            {freeBetBridgeModalState.splits.length} award{freeBetBridgeModalState.splits.length === 1 ? "" : "s"} · Total{" "}
                            {formatCurrencyValue(getFreeBetBridgeSplitTotal(freeBetBridgeModalState.splits))}
                          </span>
                        </div>
                        <div className="bridge-split-panel-actions">
                          <button
                            aria-expanded={freeBetBridgeSplitsExpanded}
                            aria-label={
                              freeBetBridgeSplitsExpanded
                                ? "Collapse free-bet award splits"
                                : "Expand free-bet award splits"
                            }
                            className="button-link compact-action-button"
                            onClick={() => setFreeBetBridgeSplitsExpanded((current) => !current)}
                            type="button"
                          >
                            <span aria-hidden="true" className="material-symbols-outlined">
                              {freeBetBridgeSplitsExpanded ? "expand_less" : "expand_more"}
                            </span>
                            {freeBetBridgeSplitsExpanded ? "Collapse" : "Expand"}
                          </button>
                          <button
                            aria-label="Clear free-bet bridge defaults"
                            className="button-link compact-action-button"
                            onClick={clearFreeBetBridgeDefaults}
                            type="button"
                          >
                            Clear defaults
                          </button>
                          <button
                            aria-label="Add split free bet"
                            className="button-link compact-action-button"
                            onClick={() => {
                              setFreeBetBridgeSplitsExpanded(true);
                              setFreeBetBridgeModalState((current) =>
                                current
                                  ? {
                                      ...current,
                                      splits: [
                                        ...current.splits,
                                        createFreeBetBridgeSplit({
                                          value: "",
                                          offerName: current.offer_name,
                                          betType: current.bet_type,
                                          fixtureType: current.fixture_type,
                                          expiry: current.expiry_datetime,
                                          retentionMode: current.retention_mode,
                                          index: current.splits.length + 1,
                                        }),
                                      ],
                                    }
                                  : current
                              );
                            }}
                            type="button"
                          >
                            <span aria-hidden="true" className="material-symbols-outlined">add</span>
                            Add split
                          </button>
                        </div>
                      </div>
                      {freeBetBridgeSplitsExpanded ? (
                      <div className="bridge-split-list">
                        {freeBetBridgeModalState.splits.map((split, index) => {
                          const updateSplit = (changes: Partial<FreeBetBridgeSplitState>) =>
                            setFreeBetBridgeModalState((current) =>
                              current
                                ? {
                                    ...current,
                                    splits: current.splits.map((entry) =>
                                      entry.split_id === split.split_id ? { ...entry, ...changes } : entry
                                    ),
                                  }
                                : current
                            );
                          const hasMultipleSplits = freeBetBridgeModalState.splits.length > 1;
                          return (
                            <div
                              className={`bridge-split-row${
                                hasMultipleSplits ? " bridge-split-row-multiple" : " bridge-split-row-single"
                              }`}
                              key={split.split_id}
                            >
                              {hasMultipleSplits ? (
                                <span className="bridge-split-index">{index + 1}</span>
                              ) : null}
                              <label className="field-control bridge-split-value">
                                <span>Split value</span>
                                <input
                                  inputMode="decimal"
                                  onChange={(event) => updateSplit({ free_bet_value: event.target.value })}
                                  value={split.free_bet_value}
                                />
                              </label>
                              <label className="field-control bridge-split-retention">
                                <span>Retention</span>
                                <select
                                  onChange={(event) => updateSplit({ retention_mode: event.target.value })}
                                  value={split.retention_mode}
                                >
                                  {freeBetRetentionModeOptions.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="field-control bridge-split-deadline">
                                <span>Award deadline</span>
                                <input
                                  onChange={(event) => updateSplit({ expiry_datetime: event.target.value })}
                                  type="datetime-local"
                                  value={split.expiry_datetime}
                                />
                              </label>
                              <label className="field-control bridge-split-bet-type">
                                <span>Bet type</span>
                                <select
                                  onChange={(event) => updateSplit({ bet_type: event.target.value })}
                                  value={split.bet_type}
                                >
                                  {freeBetBridgeBetTypeOptions.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="field-control bridge-split-fixture">
                                <span>Fixture type</span>
                                <select
                                  onChange={(event) => updateSplit({ fixture_type: event.target.value })}
                                  value={split.fixture_type}
                                >
                                  {fixtureTypeOptionsResolved.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="field-control bridge-split-campaign">
                                <span>Campaign tag</span>
                                <select
                                  onChange={(event) => updateSplit({ offer_name: event.target.value })}
                                  value={split.offer_name}
                                >
                                  {freeBetBridgeOfferNameOptions.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="field-control bridge-split-note">
                                <span>Restriction note</span>
                                <input
                                  maxLength={500}
                                  onChange={(event) => updateSplit({ user_notes: event.target.value })}
                                  placeholder="Example: football bet builder only"
                                  value={split.user_notes}
                                />
                              </label>
                              {hasMultipleSplits ? (
                                <button
                                  aria-label={`Remove split free bet ${index + 1}`}
                                  className="icon-button icon-button-destructive bridge-split-remove"
                                  onClick={() =>
                                    setFreeBetBridgeModalState((current) =>
                                      current && current.splits.length > 1
                                        ? {
                                            ...current,
                                            splits: current.splits.filter(
                                              (entry) => entry.split_id !== split.split_id
                                            ),
                                          }
                                        : current
                                    )
                                  }
                                  title="Remove this split free bet"
                                  type="button"
                                >
                                  <span aria-hidden="true" className="material-symbols-outlined">delete</span>
                                </button>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                      ) : null}
                    </div>
                    <span className="field-help field-span-2" role="status">
                      {getFreeBetBridgeValidationMessage(freeBetBridgeModalState)}
                    </span>
                  </div>
                ) : (
                  <div className="empty-state compact-empty-state" data-pd-id="sportsbook.free-bet-bridge.ready">
                    Use the footer action to prepare the free-bet bridge for this sportsbook row.
                  </div>
                )}
                {canUseFreeBetBridge ? (
                  <section
                    className="linked-free-bets-panel field-span-2 stack"
                    data-pd-id="sportsbook.free-bet-bridge.linked-free-bets"
                  >
                    <div className="section-heading-row">
                      <div>
                        <span className="eyebrow">Linked Free Bets</span>
                        <h3>Created From This Sportsbook Row</h3>
                      </div>
                      <span className="table-chip">{linkedFreeBetRows.length}</span>
                    </div>
                    {isLinkedFreeBetsLoading ? (
                      <LedgerLoadingIndicator label="Loading linked free bets" />
                    ) : linkedFreeBetRows.length > 0 ? (
                      <div className="linked-free-bets-list">
                        {linkedFreeBetRows.map((linkedFreeBet) => {
                          const blockReason = getLinkedFreeBetRemovalBlockReason(linkedFreeBet);
                          const removalPending = linkedFreeBetRemovalId === linkedFreeBet.free_bet_id;
                          return (
                            <article className="linked-free-bet-row" key={linkedFreeBet.free_bet_id}>
                              <div className="linked-free-bet-main">
                                <strong>{linkedFreeBet.offer_text || linkedFreeBet.event_name || linkedFreeBet.free_bet_id}</strong>
                                <span>
                                  {linkedFreeBet.bookmaker || "Bookmaker not set"} · {linkedFreeBet.status}
                                  {linkedFreeBet.source_award_split_total > 1
                                    ? ` · Split ${linkedFreeBet.source_award_split_index}/${linkedFreeBet.source_award_split_total}`
                                    : ""}
                                </span>
                              </div>
                              <FinancialValue value={linkedFreeBet.free_bet_value} />
                              <div className="linked-free-bet-actions">
                                {removalPending ? (
                                  <>
                                    <span className="placement-confirmation-text" role="alert">
                                      Remove linked free bet?
                                    </span>
                                    <button
                                      className="review-chip review-chip-danger"
                                      disabled={isLinkedFreeBetRemoving}
                                      onClick={() => void removeLinkedFreeBet(linkedFreeBet)}
                                      type="button"
                                    >
                                      Remove
                                    </button>
                                    <button
                                      className="review-chip review-chip-action-previous"
                                      disabled={isLinkedFreeBetRemoving}
                                      onClick={() => setLinkedFreeBetRemovalId(null)}
                                      type="button"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    aria-label={`Remove linked free bet ${linkedFreeBet.free_bet_id}`}
                                    className="icon-button icon-button-destructive"
                                    disabled={Boolean(blockReason)}
                                    onClick={() => setLinkedFreeBetRemovalId(linkedFreeBet.free_bet_id)}
                                    title={blockReason || "Remove this linked free bet"}
                                    type="button"
                                  >
                                    <span aria-hidden="true" className="material-symbols-outlined">delete</span>
                                  </button>
                                )}
                              </div>
                              {blockReason ? (
                                <span className="field-help linked-free-bet-reason">{blockReason}</span>
                              ) : null}
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="empty-state compact-empty-state">
                        {freeBetBridgeComplete
                          ? "No linked free-bet rows were found for this sportsbook row."
                          : "No free-bet rows have been created from this sportsbook row yet."}
                      </div>
                    )}
                  </section>
                ) : null}
              </EditorSection>
            </LedgerEditorTabPanel>
		            <div className="field-span-2 workflow-editor-footer" data-pd-id="sportsbook.editor.actions">
              {selectedId && settledDeleteGuardRowId === selectedId ? (
                <LedgerSettledDeleteGuard
                  disabled={isPersisting}
                  ledgerLabel="sportsbook"
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
	                    aria-label="Close sportsbook editor"
	                    className="review-chip"
	                    onClick={() => void closeEditor()}
	                    type="button"
	                  >
	                    Close
	                  </button>
	                ) : (
	                  <>
	                    <button
	                      className="review-chip review-chip-copy"
	                      disabled={isInitialLoading || isPersisting || !isDirty}
	                      type="submit"
	                    >
	                      {isPersisting ? <span aria-hidden="true" className="button-spinner" /> : null}
	                      {isPersisting ? "Saving" : settledEditEnabled ? "Save Edits" : "Save"}
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
	                        onClick={() => void handleDeleteSelectedRow()}
	                        type="button"
	                      >
	                        Delete
	                      </button>
	                    ) : null}
	                    <button className="review-chip" onClick={() => void handleResetForm()} type="button">
	                      Revert
	                    </button>
		                {showFreeBetBridgeFooterAction ? (
		                  <>
		                    <span aria-hidden="true" className="workflow-editor-footer-divider" />
		                    <button
		                      aria-label="Create free bet from sportsbook row"
		                      className="review-chip review-chip-action-bridge"
		                      disabled={
		                        isFreeBetBridgeSubmitting ||
		                        Boolean(
		                          freeBetBridgeModalState
		                            ? getFreeBetBridgeValidationMessage(freeBetBridgeModalState)
		                            : null
		                        )
		                      }
		                      onClick={() => void handleFreeBetBridgeFooterAction()}
		                      type="button"
		                    >
		                      {isFreeBetBridgeSubmitting ? <span aria-hidden="true" className="button-spinner" /> : null}
		                      {isFreeBetBridgeSubmitting
		                        ? "Creating Free Bet"
		                        : freeBetBridgeComplete
		                          ? "Create Another Free Bet"
		                          : freeBetBridgeModalState?.splits.length === 1
		                            ? "Create Free Bet"
		                            : `Create ${freeBetBridgeModalState?.splits.length ?? 0} Free Bets`}
		                    </button>
		                  </>
		                ) : null}
	                  </>
	                )}
		              </div>
	              <div
	                aria-label="Editor tab navigation"
	                className="tracker-nav workflow-editor-footer-nav"
	                data-pd-id="sportsbook.editor.footer-tab-actions"
	                role="group"
	              >
	                <button
	                  className="review-chip review-chip-action-previous"
	                  disabled={!previousEditorTab}
	                  onClick={() => {
	                    if (previousEditorTab) {
	                      activateEditorTab(previousEditorTab.id as SportsbookEditorTabId);
	                    }
	                  }}
	                  type="button"
	                >
	                  Previous
	                </button>
	                <button
	                  className="review-chip review-chip-action-next"
	                  disabled={!nextEditorTab}
	                  onClick={() => {
	                    if (nextEditorTab) {
	                      activateEditorTab(nextEditorTab.id as SportsbookEditorTabId);
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
