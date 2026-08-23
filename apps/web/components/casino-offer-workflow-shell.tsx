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
import { CasinoFreeSpinsQuickAdd, type CasinoFreeSpinsQuickAddValues } from "@/components/casino-free-spins-quick-add";
import { LedgerSettledDeleteGuard } from "@/components/ledger-settled-delete-guard";
import { TrackerRangeCard } from "@/components/tracker-range-card";
import { FeeReviewResolutionBanner } from "@/components/fee-review-resolution-banner";
import type { CommonBetCombo } from "@/components/common-bet-combo-settings";
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
  casinoOfferTypeUsesFieldGroup,
  casinoOfferTypeUsesTab,
  getCasinoOfferCapabilities,
  getCasinoOfferTypeDisplayLabel,
  getCasinoOfferTypeHelpText,
  getCasinoOfferRequiredFields,
  getCasinoOfferResultOptions,
  getCasinoOfferTypeOptions,
  normalizeCasinoOfferType,
  type CasinoEditorTabId,
} from "@/lib/casino-offer-types";
import {
  calculateCasinoSettlementNetResult,
  calculateRewardWagerTarget,
  calculateSpinsRequired,
  calculateWagerTarget,
  type CasinoCalculationMoneyResult,
  type CasinoSpinCalculationResult,
  type CasinoWagerBase,
} from "@/lib/casino-calculations";
import { dispatchTrackerDataUpdated } from "@/lib/tracker-data-events";
import type { TableColumn } from "@/lib/tracker-modules";
import { saveTrackerDatePreset } from "@/lib/tracker-settings-client";
import {
  formatDisplayDate,
  formatResolvedDateRange,
  formatResolvedDateRangeContext,
  resolveDateRange,
  type DatePreset,
} from "@/lib/tracker-summary";
import { filterTrackerRows, getTrackerPageCount, paginateTrackerRows } from "@/lib/tracker-table";
import type { TrackerRow } from "@/lib/tracker-types";
import { confirmDestructiveAction, useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { sortIssueBadgesByPriority } from "@/lib/issue-priority";
import { resolveCasinoBookmakerCoverage } from "@/lib/casino-offer-knowledge";
import { getCasinoOperationalIssueBadges } from "@/lib/operational-actions";
import {
  casinoOfferStatusOptions,
  dedupeOptions,
} from "@/lib/workbook-options";

type CasinoOfferRecord = {
  casino_offer_id: string;
  profile_id: string;
  offer_group_id: string;
  date_started: string;
  date_settling: string;
  expiry_datetime: string;
  bookmaker: string;
  offer_type: string;
  offer_name: string;
  game: string;
  cash_stake: string;
  credit_amount: string;
  bonus_amount: string;
  wager_multiplier: string;
  wager_target: string;
  required_spins: string;
  spin_stake: string;
  free_spins_awarded: string;
  free_spins_value: string;
  wagering_base: string;
  custom_wager_base: string;
  wagering_completed: string;
  rtp_percent: string;
  reward_type: string;
  reward_wager_multiplier: string;
  reward_wager_target: string;
  reward_required_spins: string;
  reward_wagering_completed: string;
  reward_rtp_percent: string;
  expected_reward_cash_value: string;
  qualifying_expected_loss: string;
  reward_expected_loss: string;
  other_expected_costs: string;
  campaign_ev: string;
  own_cash_committed: string;
  cash_returned: string;
  settlement_other_costs: string;
  status: string;
  result: string;
  calc_net_pnl: string;
  final_net_pnl: string;
  user_notes: string;
  created_at: string;
  updated_at: string;
  resolved_net_pnl: string | null;
  calculation_state: string;
  calculation_notes: string[];
  counts_as_open: boolean;
  is_overdue: boolean;
  week_label: string;
};

type CasinoOfferFormState = {
  casino_offer_id?: string;
  offer_group_id: string;
  date_started: string;
  date_settling: string;
  expiry_datetime: string;
  bookmaker: string;
  offer_type: string;
  offer_name: string;
  game: string;
  cash_stake: string;
  credit_amount: string;
  bonus_amount: string;
  wager_multiplier: string;
  wager_target: string;
  required_spins: string;
  spin_stake: string;
  free_spins_awarded: string;
  free_spins_value: string;
  wagering_base: string;
  custom_wager_base: string;
  wagering_completed: string;
  rtp_percent: string;
  reward_type: string;
  reward_wager_multiplier: string;
  reward_wager_target: string;
  reward_required_spins: string;
  reward_wagering_completed: string;
  reward_rtp_percent: string;
  expected_reward_cash_value: string;
  qualifying_expected_loss: string;
  reward_expected_loss: string;
  other_expected_costs: string;
  campaign_ev: string;
  own_cash_committed: string;
  cash_returned: string;
  settlement_other_costs: string;
  status: string;
  result: string;
  calc_net_pnl: string;
  final_net_pnl: string;
  user_notes: string;
};

type CasinoGuidedFieldKey =
  | "date_started"
  | "bookmaker"
  | "offer_name"
  | "offer_type"
  | "cash_stake"
  | "credit_amount"
  | "bonus_amount"
  | "wager_multiplier"
  | "wager_target"
  | "required_spins"
  | "spin_stake"
  | "free_spins_awarded"
  | "free_spins_value"
  | "result"
  | "final_net_pnl";

type CasinoGuidedEntry = {
  message: string;
  nextRequiredField: CasinoGuidedFieldKey | null;
  state: "ready" | "review_required" | "complete";
};

type CasinoMoneyFieldKey =
  | "cash_stake"
  | "credit_amount"
  | "bonus_amount"
  | "wager_multiplier"
  | "wager_target"
  | "required_spins"
  | "spin_stake"
  | "free_spins_awarded"
  | "free_spins_value"
  | "own_cash_committed"
  | "cash_returned"
  | "settlement_other_costs"
  | "calc_net_pnl"
  | "final_net_pnl";

const casinoCurrencyKeypadFields = new Set<CasinoMoneyFieldKey>([
  "cash_stake",
  "credit_amount",
  "bonus_amount",
  "wager_target",
  "spin_stake",
  "free_spins_value",
  "own_cash_committed",
  "cash_returned",
  "settlement_other_costs",
  "calc_net_pnl",
  "final_net_pnl",
]);

const casinoGuidedFieldTabMap: Record<CasinoGuidedFieldKey, CasinoEditorTabId> = {
  bonus_amount: "campaign",
  bookmaker: "setup",
  cash_stake: "campaign",
  credit_amount: "campaign",
  date_started: "setup",
  final_net_pnl: "settlement",
  free_spins_awarded: "reward",
  free_spins_value: "reward",
  offer_name: "setup",
  offer_type: "setup",
  required_spins: "reward",
  result: "settlement",
  spin_stake: "reward",
  wager_multiplier: "campaign",
  wager_target: "campaign",
};

function getCasinoGuidedFieldTab(formState: CasinoOfferFormState, field: CasinoGuidedFieldKey): CasinoEditorTabId {
  if (field === "spin_stake" && casinoOfferTypeUsesFieldGroup(formState.offer_type, "wagering")) {
    return "campaign";
  }
  return casinoGuidedFieldTabMap[field];
}

const casinoGuidedTabLabels: Record<CasinoEditorTabId, string> = {
  advanced: "Advanced",
  campaign: "Wagering",
  reward: "Reward",
  setup: "Offer Setup",
  settlement: "Settlement",
};

type CasinoOutcomeModalState = {
  rowId: string;
  status: string;
  result: string;
  date_settling: string;
  final_net_pnl: string;
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

type CasinoOfferTableMode =
  | "recent"
  | "settling-soon"
  | "prospecting"
  | "open"
  | "wagering"
  | "free-spins"
  | "cashback"
  | "overdue";

type CasinoIssueFilter =
  | "any"
  | "all-issues"
  | "offer-unplaced"
  | "no-settle-date"
  | "outcome-needed"
  | "final-value-needed";
type CasinoSortKey = "date_settling" | "bookmaker" | "status" | "displayed_value";
type CasinoSortDirection = "asc" | "desc";
type CasinoTableSort = {
  key: CasinoSortKey;
  direction: CasinoSortDirection;
};
type CasinoTableFilterState = {
  bookmaker: string;
  offer_type: string;
  status: string;
  result: string;
  issue_type: CasinoIssueFilter;
  min_value: string;
  max_value: string;
};

const casinoPlaceholderStatuses = new Set(["Prospecting"]);

type CasinoColumnKey =
  | "date_settling"
  | "expiry_datetime"
  | "bookmaker"
  | "offer_name"
  | "game"
  | "offer_type"
  | "status"
  | "result"
  | "displayed_value"
  | "actions";

const casinoTableColumns: TableColumn[] = [
  { key: "date_settling", label: "Settles" },
  { key: "expiry_datetime", label: "Expiry" },
  { key: "bookmaker", label: "Bookmaker" },
  { key: "offer_name", label: "Offer Name" },
  { key: "game", label: "Game" },
  { key: "offer_type", label: "Offer type" },
  { key: "status", label: "Status" },
  { key: "result", label: "Result" },
  { key: "displayed_value", label: "Value", align: "end" },
  { key: "actions", label: "Actions" },
];

const defaultVisibleCasinoColumns = new Set<CasinoColumnKey>([
  "date_settling",
  "expiry_datetime",
  "bookmaker",
  "offer_name",
  "game",
  "offer_type",
  "status",
  "result",
  "displayed_value",
  "actions",
]);

const hideableCasinoColumnKeys = new Set<CasinoColumnKey>([
  "date_settling",
  "expiry_datetime",
  "bookmaker",
  "offer_name",
  "game",
  "offer_type",
]);

const defaultCasinoColumnWidths: Record<CasinoColumnKey, number> = {
  date_settling: 190,
  expiry_datetime: 170,
  bookmaker: 130,
  offer_name: 180,
  game: 180,
  offer_type: 150,
  status: 135,
  result: 135,
  displayed_value: 130,
  actions: 110,
};

const casinoOfferTableModes: Array<{ value: CasinoOfferTableMode; label: string }> = [
  { value: "recent", label: "Recent" },
  { value: "settling-soon", label: "Settling soon" },
  { value: "prospecting", label: "Prospecting" },
  { value: "open", label: "Open" },
  { value: "wagering", label: "Wagering" },
  { value: "free-spins", label: "Free spins" },
  { value: "cashback", label: "Cashback" },
  { value: "overdue", label: "Overdue" },
];

const emptyTableFilters: CasinoTableFilterState = {
  bookmaker: "",
  offer_type: "",
  status: "",
  result: "",
  issue_type: "any",
  min_value: "",
  max_value: "",
};

function parseCasinoCurrencyLikeValue(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized.replace(/[£,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function getCasinoIssueTone(
  row: Pick<
    CasinoOfferRecord,
    "status" | "result" | "date_settling" | "is_overdue" | "resolved_net_pnl"
  >
): "warning" | "danger" | null {
  const issues = getCasinoOperationalIssueBadges(row);
  if (issues.length === 0) {
    return null;
  }
  return issues.some((issue) => issue.tone === "danger") ? "danger" : "warning";
}

function getCasinoIssueFilterMatch(row: CasinoOfferRecord, issueType: CasinoIssueFilter): boolean {
  if (issueType === "any") {
    return true;
  }
  const labels = new Set(getCasinoOperationalIssueBadges(row).map((badge) => badge.label));
  if (issueType === "all-issues") {
    return labels.size > 0;
  }
  if (issueType === "offer-unplaced") {
    return labels.has("Offer Unplaced");
  }
  if (issueType === "no-settle-date") {
    return labels.has("No Settle Date");
  }
  if (issueType === "outcome-needed") {
    return labels.has("Outcome Needed");
  }
  if (issueType === "final-value-needed") {
    return labels.has("Final Value Needed");
  }
  return true;
}

function isSortableCasinoColumn(columnKey: string): columnKey is CasinoSortKey {
  return (
    columnKey === "date_settling" ||
    columnKey === "bookmaker" ||
    columnKey === "status" ||
    columnKey === "displayed_value"
  );
}

function createBlankForm(): CasinoOfferFormState {
  return {
    offer_group_id: "",
    date_started: "",
    date_settling: "",
    expiry_datetime: "",
    bookmaker: "",
    offer_type: "",
    offer_name: "",
    game: "",
    cash_stake: "",
    credit_amount: "",
    bonus_amount: "",
    wager_multiplier: "",
    wager_target: "",
    required_spins: "",
    spin_stake: "",
    free_spins_awarded: "",
    free_spins_value: "",
    wagering_base: "",
    custom_wager_base: "",
    wagering_completed: "",
    rtp_percent: "",
    reward_type: "",
    reward_wager_multiplier: "",
    reward_wager_target: "",
    reward_required_spins: "",
    reward_wagering_completed: "",
    reward_rtp_percent: "",
    expected_reward_cash_value: "",
    qualifying_expected_loss: "",
    reward_expected_loss: "",
    other_expected_costs: "",
    campaign_ev: "",
    own_cash_committed: "",
    cash_returned: "",
    settlement_other_costs: "",
    status: "Prospecting",
    result: "Pending",
    calc_net_pnl: "",
    final_net_pnl: "",
    user_notes: "",
  };
}

function recordToForm(record: CasinoOfferRecord): CasinoOfferFormState {
  return {
    casino_offer_id: record.casino_offer_id,
    offer_group_id: record.offer_group_id,
    date_started: toDateTimeLocalValue(record.date_started),
    date_settling: toDateTimeLocalValue(record.date_settling),
    expiry_datetime: toDateTimeLocalValue(record.expiry_datetime),
    bookmaker: record.bookmaker,
    offer_type: record.offer_type,
    offer_name: record.offer_name,
    game: record.game,
    cash_stake: record.cash_stake,
    credit_amount: record.credit_amount,
    bonus_amount: record.bonus_amount,
    wager_multiplier: record.wager_multiplier,
    wager_target: record.wager_target,
    required_spins: record.required_spins,
    spin_stake: record.spin_stake,
    free_spins_awarded: record.free_spins_awarded,
    free_spins_value: record.free_spins_value,
    wagering_base: record.wagering_base ?? "",
    custom_wager_base: record.custom_wager_base ?? "",
    wagering_completed: record.wagering_completed ?? "",
    rtp_percent: record.rtp_percent ?? "",
    reward_type: record.reward_type ?? "",
    reward_wager_multiplier: record.reward_wager_multiplier ?? "",
    reward_wager_target: record.reward_wager_target ?? "",
    reward_required_spins: record.reward_required_spins ?? "",
    reward_wagering_completed: record.reward_wagering_completed ?? "",
    reward_rtp_percent: record.reward_rtp_percent ?? "",
    expected_reward_cash_value: record.expected_reward_cash_value ?? "",
    qualifying_expected_loss: record.qualifying_expected_loss ?? "",
    reward_expected_loss: record.reward_expected_loss ?? "",
    other_expected_costs: record.other_expected_costs ?? "",
    campaign_ev: record.campaign_ev ?? "",
    own_cash_committed: record.own_cash_committed ?? "",
    cash_returned: record.cash_returned ?? "",
    settlement_other_costs: record.settlement_other_costs ?? "",
    status: record.status,
    result: record.result,
    calc_net_pnl: record.calc_net_pnl,
    final_net_pnl: record.final_net_pnl,
    user_notes: record.user_notes,
  };
}

const wageringCampaignOfferTypes = new Set([
  "Wager To Earn Reward",
  "Deposit And Bonus Wagering",
  "No-Deposit Bonus / Bonus Credit",
  "Wager To Earn Free Spins",
  "Wagering / Turnover Challenge",
  "Fixed Wagering Requirement",
  "Daily / Recurring Casino Reward",
]);
const rewardCampaignOfferTypes = new Set([
  "Free Spins",
  "Fixed Spins Or Free Play",
  "Risk-Free / Refund",
  "Wager To Earn Reward",
  "Deposit And Bonus Wagering",
  "No-Deposit Bonus / Bonus Credit",
  "Wager To Earn Free Spins",
  "Deposit To Receive Free Spins",
  "Daily / Recurring Casino Reward",
  "Prize / Mystery Reward",
]);

const commonCasinoWagerMultipliers = ["1", "5", "10", "20", "30", "40"];
const commonCasinoSpinStakes = ["0.10", "0.20", "0.25", "0.50", "1.00"];
const commonCasinoOfferTypeChips = [
  "Free Spins",
  "Wager To Earn Free Spins",
  "Deposit And Bonus Wagering",
  "Cashback / Loss Back",
  "Daily / Recurring Casino Reward",
];

function getCasinoResultOptions(offerType: string): string[] {
  return getCasinoOfferResultOptions(offerType);
}

function applyCasinoOfferTypeDefaults(
  current: CasinoOfferFormState,
  nextOfferType: string
): CasinoOfferFormState {
  const normalizedOfferType = normalizeCasinoOfferType(nextOfferType);
  const nextState = {
    ...current,
    offer_type: normalizedOfferType,
    cash_stake: "",
    credit_amount: "",
    bonus_amount: "",
    wager_multiplier: "",
    wager_target: "",
    required_spins: "",
    spin_stake: "",
    free_spins_awarded: "",
    free_spins_value: "",
    wagering_base: "",
    custom_wager_base: "",
    wagering_completed: "",
    rtp_percent: "",
    reward_type: "",
    reward_wager_multiplier: "",
    reward_wager_target: "",
    reward_required_spins: "",
    reward_wagering_completed: "",
    reward_rtp_percent: "",
    expected_reward_cash_value: "",
    qualifying_expected_loss: "",
    reward_expected_loss: "",
    other_expected_costs: "",
    campaign_ev: "",
    own_cash_committed: "",
    cash_returned: "",
    settlement_other_costs: "",
    status: "Prospecting",
    result: "Pending",
    calc_net_pnl: "",
    final_net_pnl: "",
    user_notes: "",
  };
  const ownCashSuggestion = getCasinoOwnCashCommittedSuggestion(nextState);
  return {
    ...nextState,
    own_cash_committed: ownCashSuggestion.value ?? "",
  };
}

function applyCasinoResultDefaults(
  current: CasinoOfferFormState,
  nextResult: string
): CasinoOfferFormState {
  const nextStatus =
    nextResult === "Pending"
      ? current.status === "Settled"
        ? "Started"
        : current.status
      : nextResult === "Void"
        ? "Settled"
        : "Settled";

  const rewardValue = formatCasinoMoneyInput(current.free_spins_value);
  const shouldUseRewardValue =
    !current.final_net_pnl.trim() &&
    rewardValue &&
    (nextResult === "Win" || nextResult === "Mixed");
  const shouldUseZeroValue =
    !current.final_net_pnl.trim() && (nextResult === "Lose" || nextResult === "Void");

  return {
    ...current,
    result: nextResult,
    status: nextStatus,
    final_net_pnl: shouldUseRewardValue
      ? rewardValue
      : shouldUseZeroValue
        ? "0.00"
        : current.final_net_pnl,
  };
}

function applyCasinoStatusDefaults(
  current: CasinoOfferFormState,
  nextStatus: string
): CasinoOfferFormState {
  if (nextStatus === "Prospecting" || nextStatus === "Started" || nextStatus === "In Progress") {
    return {
      ...current,
      status: nextStatus,
      result: "Pending",
    };
  }

  return {
    ...current,
    status: nextStatus,
  };
}

function applyCasinoZeroRewardValue(current: CasinoOfferFormState): CasinoOfferFormState {
  return applyCasinoRewardValueChange(current, "0.00");
}

function applyCasinoRewardValueChange(
  current: CasinoOfferFormState,
  nextRewardValue: string
): CasinoOfferFormState {
  const finalValue = current.final_net_pnl.trim();
  const finalWasFollowingReward = Boolean(finalValue) && finalValue === current.free_spins_value;
  const shouldMirrorToSettlement =
    (!finalValue && (current.status === "Settled" || current.result === "Win" || current.result === "Mixed")) ||
    finalWasFollowingReward;

  const nextState = {
    ...current,
    free_spins_value: nextRewardValue,
    final_net_pnl: shouldMirrorToSettlement ? nextRewardValue : current.final_net_pnl,
  };

  return casinoOfferTypeUsesFieldGroup(current.offer_type, "wagering")
    ? nextState
    : applyDerivedRewardWagerTarget(nextState);
}

type CasinoOwnCashCommittedSuggestion = {
  value: string | null;
  sourceLabel: string;
};

function getCasinoOwnCashCommittedSuggestion(
  formState: CasinoOfferFormState
): CasinoOwnCashCommittedSuggestion {
  const normalizedOfferType = normalizeCasinoOfferType(formState.offer_type);
  const cashStake = formatCasinoMoneyInput(formState.cash_stake);
  if (cashStake) {
    return {
      value: cashStake,
      sourceLabel: casinoOfferTypeUsesFieldGroup(normalizedOfferType, "wagering")
        ? "Suggested from Wagering cash stake"
        : "Suggested from cash stake",
    };
  }

  const hasNoCashCommitment =
    !casinoOfferTypeUsesFieldGroup(normalizedOfferType, "cashStake") &&
    normalizedOfferType !== "Other / Custom";
  if (hasNoCashCommitment) {
    return {
      value: "0.00",
      sourceLabel: "Suggested as no own cash required",
    };
  }

  return {
    value: null,
    sourceLabel: "No cash suggestion available",
  };
}

function applySuggestedOwnCashCommitted(
  current: CasinoOfferFormState,
  next: CasinoOfferFormState
): CasinoOfferFormState {
  const previousSuggestion = getCasinoOwnCashCommittedSuggestion(current).value;
  const currentCommitted = formatCasinoMoneyInput(current.own_cash_committed);
  const shouldFollowSuggestion =
    !current.own_cash_committed.trim() ||
    (Boolean(previousSuggestion) && currentCommitted === previousSuggestion);

  if (!shouldFollowSuggestion) {
    return next;
  }

  return {
    ...next,
    own_cash_committed: getCasinoOwnCashCommittedSuggestion(next).value ?? "",
  };
}

function getCasinoGuidedMessage(field: CasinoGuidedFieldKey, formState: CasinoOfferFormState): string {
  switch (field) {
    case "date_started":
      return "Add The Start Date.";
    case "bookmaker":
      return "Choose The Bookmaker.";
    case "offer_name":
      return "Add The Offer Name.";
    case "offer_type":
      return "Choose The Offer Type.";
    case "cash_stake":
      return "Add The Cash Stake.";
    case "credit_amount":
      return `Add The ${getCreditAmountLabel(formState.offer_type)}.`;
    case "bonus_amount":
      return "Add The Bonus Amount.";
    case "wager_multiplier":
      return "Add The Wager Multiplier.";
    case "wager_target":
      return "Add The Wager Target.";
    case "required_spins":
      return "Add The Required Spins.";
    case "spin_stake":
      return "Add The Spin Stake.";
    case "free_spins_awarded":
      return "Add The Free Spins Awarded.";
    case "free_spins_value":
      return `Add The ${getRewardValueLabel(formState.offer_type)}.`;
    case "result":
      return "Choose The Outcome.";
    case "final_net_pnl":
      return "Add The Net Result.";
    default:
      return "Complete The Required Field.";
  }
}

function getCasinoSummaryStatusChipClass(status: string): string {
  if (status === "Settled") return "table-chip table-chip-status-settled";
  if (status === "Started" || status === "In Progress") return "table-chip table-chip-status-placed";
  if (status === "Prospecting") return "table-chip table-chip-muted";
  return "table-chip";
}

function getCasinoSummaryResultChipClass(result: string): string {
  if (result === "Pending") return "table-chip table-chip-warning";
  if (result === "Lose" || result === "Loss") return "table-chip table-chip-danger";
  if (result === "Void") return "table-chip table-chip-muted";
  return "table-chip table-chip-status-placed";
}

function getCasinoMoneyToneClass(value: string): string {
  const parsed = Number(value.replace(/,/g, "").trim());
  if (!Number.isFinite(parsed) || parsed === 0) return "casino-money-field-neutral";
  return parsed > 0 ? "casino-money-field-positive" : "casino-money-field-negative";
}

function applyCasinoOutcomeModalResultDefaults(
  current: CasinoOutcomeModalState,
  nextResult: string
): CasinoOutcomeModalState {
  const nextStatus =
    nextResult === "Pending"
      ? current.status === "Settled"
        ? "Started"
        : current.status
      : "Settled";

  return {
    ...current,
    result: nextResult,
    status: nextStatus,
  };
}

function applyCasinoOutcomeModalStatusDefaults(
  current: CasinoOutcomeModalState,
  nextStatus: string
): CasinoOutcomeModalState {
  if (nextStatus === "Prospecting" || nextStatus === "Started" || nextStatus === "In Progress") {
    return {
      ...current,
      status: nextStatus,
      result: "Pending",
    };
  }

  return {
    ...current,
    status: nextStatus,
  };
}

function getDisplayedCasinoValue(row: CasinoOfferRecord | null): string {
  return row?.resolved_net_pnl ?? row?.final_net_pnl ?? row?.calc_net_pnl ?? "—";
}

function getDisplayedCasinoValueLabel(row: CasinoOfferRecord | null): string {
  if (row?.final_net_pnl) {
    return "Net result";
  }
  if (row?.calc_net_pnl) {
    return "Reference net value";
  }
  return "Resolved value";
}

function getDisplayedCasinoValueForRow(row: CasinoOfferRecord): string {
  return getDisplayedCasinoValue(row);
}

function getDisplayedCasinoValueLabelForRow(row: CasinoOfferRecord): string {
  return getDisplayedCasinoValueLabel(row);
}

function getDisplayedCasinoValueForForm(formState: CasinoOfferFormState): string {
  const finalValue = formState.final_net_pnl.trim();
  if (parseCasinoDisplayValue(finalValue) !== null) {
    return finalValue;
  }

  const currentValue = formState.calc_net_pnl.trim();
  if (parseCasinoDisplayValue(currentValue) !== null) {
    return currentValue;
  }

  const rewardValue = formState.free_spins_value.trim();
  if (rewardValue) {
    return rewardValue;
  }

  return "—";
}

function getDisplayedCasinoValueLabelForForm(formState: CasinoOfferFormState): string {
  if (formState.status === "Settled" || formState.result !== "Pending") {
    return "Net result";
  }
  if (formState.calc_net_pnl.trim()) {
    return "Reference net value";
  }
  if (formState.free_spins_value.trim()) {
    return getRewardValueLabel(formState.offer_type);
  }
  if (casinoPlaceholderStatuses.has(formState.status)) {
    return "Current value pending";
  }
  return "Value";
}

function parseCasinoDisplayValue(value: string | null | undefined): number | null {
  const normalized = value?.trim();
  if (!normalized || normalized === "—" || normalized === "-") {
    return null;
  }

  const isAccountingNegative = normalized.includes("(") && normalized.includes(")");
  const parsed = Number(
    normalized
      .replace(/[£,\s()]/g, "")
      .replace(/^−/, "-")
  );
  if (isAccountingNegative && Number.isFinite(parsed)) {
    return -Math.abs(parsed);
  }
  return Number.isFinite(parsed) ? parsed : null;
}

function renderCasinoFinancialValue(
  value: number | string | null | undefined,
  options: { zeroAsNumeric?: boolean } = {}
) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? parseCasinoDisplayValue(value)
        : null;

  if (parsed === 0 && options.zeroAsNumeric) {
    return (
      <span className="projected-outcome-financial-value financial-value financial-value-neutral">
        £ 0
      </span>
    );
  }

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

function renderCasinoPlanningAmount(value: number | string | null | undefined) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? parseCasinoDisplayValue(value)
        : null;

  return (
    <span className="casino-planning-money-value">
      {parsed === null ? "£ -" : `£ ${Math.abs(parsed).toFixed(2)}`}
    </span>
  );
}

function formatCasinoSpinCount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Set target";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function getCasinoGuidedFieldFromLabel(label: string): CasinoGuidedFieldKey | null {
  switch (label) {
    case "Offer name":
      return "offer_name";
    case "Date started":
      return "date_started";
    case "Bookmaker":
      return "bookmaker";
    case "Offer type":
      return "offer_type";
    case "Cash stake":
      return "cash_stake";
    case "Bonus amount":
      return "bonus_amount";
    case "Wager multiplier":
      return "wager_multiplier";
    case "Wager target":
      return "wager_target";
    case "Cashback amount":
    case "Refund / credit amount":
    case "Free-play amount":
    case "Credit amount":
      return "credit_amount";
    case "Required spins":
      return "required_spins";
    case "Spin stake":
      return "spin_stake";
    case "Free spins awarded":
      return "free_spins_awarded";
    case "Converted win amount":
    case "Converted free-play amount":
    case "Returned credit amount":
    case "Converted reward amount":
      return "free_spins_value";
    case "Result":
      return "result";
    case "Net Result":
      return "final_net_pnl";
    default:
      return null;
  }
}

function getMissingCasinoSettlementFields(formState: CasinoOfferFormState): string[] {
  if (formState.status !== "Settled") {
    return [];
  }

  const missing: string[] = [];
  if (formState.result === "Pending") {
    missing.push("Result");
  }
  if (!formState.final_net_pnl.trim() && !formState.calc_net_pnl.trim()) {
    missing.push("Net Result");
  }

  return missing;
}

function getCasinoGuidedEntry({
  formState,
  missingCampaignFields,
  missingOfferIdentityFields,
  missingRewardFields,
  missingSettlementFields,
}: {
  formState: CasinoOfferFormState;
  missingCampaignFields: string[];
  missingOfferIdentityFields: string[];
  missingRewardFields: string[];
  missingSettlementFields: string[];
}): CasinoGuidedEntry {
  const missingOfferField = missingOfferIdentityFields
    .map(getCasinoGuidedFieldFromLabel)
    .find((field): field is CasinoGuidedFieldKey => Boolean(field));
  if (missingOfferField) {
    return {
      message: getCasinoGuidedMessage(missingOfferField, formState),
      nextRequiredField: missingOfferField,
      state: "ready",
    };
  }

  const missingCampaignField = missingCampaignFields
    .map(getCasinoGuidedFieldFromLabel)
    .find((field): field is CasinoGuidedFieldKey => Boolean(field));
  if (missingCampaignField) {
    return {
      message: getCasinoGuidedMessage(missingCampaignField, formState),
      nextRequiredField: missingCampaignField,
      state: "ready",
    };
  }

  const missingRewardField = missingRewardFields
    .map(getCasinoGuidedFieldFromLabel)
    .find((field): field is CasinoGuidedFieldKey => Boolean(field));
  if (missingRewardField) {
    return {
      message: getCasinoGuidedMessage(missingRewardField, formState),
      nextRequiredField: missingRewardField,
      state: "ready",
    };
  }

  const missingSettlementField = missingSettlementFields
    .map(getCasinoGuidedFieldFromLabel)
    .find((field): field is CasinoGuidedFieldKey => Boolean(field));
  if (missingSettlementField) {
    return {
      message: getCasinoGuidedMessage(missingSettlementField, formState),
      nextRequiredField: missingSettlementField,
      state: "review_required",
    };
  }

  if (formState.status === "Settled" && formState.result === "Pending") {
    return { message: "Choose The Outcome.", nextRequiredField: "result", state: "ready" };
  }
  if (formState.status === "Settled" && !formState.final_net_pnl.trim() && !formState.calc_net_pnl.trim()) {
    return {
      message: getCasinoGuidedMessage("final_net_pnl", formState),
      nextRequiredField: "final_net_pnl",
      state: "review_required",
    };
  }

  return { message: "Casino row is ready.", nextRequiredField: null, state: "complete" };
}

function getComparableDate(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function parseDateValue(value: string | null | undefined): Date | null {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isDateWithinResolvedRange(
  candidate: Date | null,
  resolvedRange: ReturnType<typeof resolveDateRange>
): boolean {
  if (!candidate) {
    return false;
  }

  return candidate >= resolvedRange.start && candidate <= resolvedRange.end;
}

function getCasinoRangeAnchor(row: CasinoOfferRecord): Date | null {
  return (
    parseDateValue(row.date_settling) ??
    parseDateValue(row.date_started) ??
    parseDateValue(row.expiry_datetime)
  );
}

function getCasinoCampaignHeading(offerType: string): string {
  const normalizedOfferType = normalizeCasinoOfferType(offerType);
  if (normalizedOfferType === "Deposit And Bonus Wagering") {
    return "Deposit & Wager";
  }
  if (normalizedOfferType === "Wager To Earn Free Spins") {
    return "Wager & Earn Spins";
  }
  if (normalizedOfferType === "Wager To Earn Reward") {
    return "Wager & Earn Reward";
  }
  if (normalizedOfferType === "Deposit To Receive Free Spins") {
    return "Deposit & Claim Spins";
  }
  if (normalizedOfferType === "Wagering / Turnover Challenge") {
    return "Turnover Challenge";
  }
  if (normalizedOfferType === "Fixed Wagering Requirement") {
    return "Fixed Wagering Target";
  }
  if (normalizedOfferType === "No-Deposit Bonus / Bonus Credit") {
    return "No-Deposit Bonus";
  }
  if (normalizedOfferType === "Daily / Recurring Casino Reward") {
    return "Daily Reward";
  }
  if (wageringCampaignOfferTypes.has(normalizedOfferType)) {
    return "Wagering Plan";
  }
  if (normalizedOfferType === "Cashback / Loss Back") {
    return "Cashback economics";
  }
  if (normalizedOfferType === "Risk-Free / Refund") {
    return "Qualifying and refund path";
  }
  if (normalizedOfferType === "Free Spins") {
    return "Free Spins Plan";
  }
  if (normalizedOfferType === "Fixed Spins Or Free Play") {
    return "Free Play Plan";
  }
  if (normalizedOfferType === "Other / Custom") {
    return "Casino stake details";
  }
  if (rewardCampaignOfferTypes.has(normalizedOfferType)) {
    return "Reward Details";
  }
  return "Campaign Values";
}

function getCasinoRewardHeading(offerType: string): string {
  const normalizedOfferType = normalizeCasinoOfferType(offerType);
  if (normalizedOfferType === "Risk-Free / Refund") {
    return "Refund Return";
  }
  if (normalizedOfferType === "Fixed Spins Or Free Play") {
    return "Free Play Conversion";
  }
  if (normalizedOfferType === "Free Spins") {
    return "Spin Conversion";
  }
  if (normalizedOfferType === "Wager To Earn Free Spins" || normalizedOfferType === "Deposit To Receive Free Spins") {
    return "Free Spins Award";
  }
  return "Reward Conversion";
}

function getCasinoCampaignLockReason(formState: CasinoOfferFormState): string {
  if (!formState.offer_type.trim()) {
    return "Choose offer type";
  }
  if (casinoPlaceholderStatuses.has(formState.status)) {
    return "Prospecting row";
  }
  return "Complete offer setup";
}

function getCasinoRewardLockReason(formState: CasinoOfferFormState): string {
  if (!formState.offer_type.trim()) {
    return "Choose reward offer";
  }
  if (casinoPlaceholderStatuses.has(formState.status)) {
    return "Activate campaign first";
  }
  return "Complete campaign values";
}

function getCreditAmountLabel(offerType: string): string {
  const normalizedOfferType = normalizeCasinoOfferType(offerType);
  if (normalizedOfferType === "Cashback / Loss Back") {
    return "Cashback amount";
  }
  if (normalizedOfferType === "Fixed Spins Or Free Play") {
    return "Free-play amount";
  }
  if (normalizedOfferType === "Risk-Free / Refund") {
    return "Refund / credit amount";
  }
  return "Credit amount";
}

function getRewardValueLabel(offerType: string): string {
  const normalizedOfferType = normalizeCasinoOfferType(offerType);
  const capabilities = getCasinoOfferCapabilities(normalizedOfferType);
  if (normalizedOfferType === "Fixed Spins Or Free Play") {
    return "Converted free-play amount";
  }
  if (normalizedOfferType === "Risk-Free / Refund") {
    return "Returned credit amount";
  }
  if (capabilities.rewardType === "free_spins") {
    return "Converted win amount";
  }
  return "Converted reward amount";
}

function getCasinoEffectiveWagerTargetForSpins(formState: CasinoOfferFormState): string | number {
  if (casinoOfferTypeUsesFieldGroup(formState.offer_type, "wagering")) {
    const derivedTarget = getCasinoWagerTargetResult(formState);
    return derivedTarget.value ?? formState.wager_target;
  }

  const rewardWageringApplies =
    getCasinoOfferCapabilities(formState.offer_type).hasRewardWagering &&
    casinoOfferTypeUsesFieldGroup(formState.offer_type, "rewardValue") &&
    casinoOfferTypeUsesFieldGroup(formState.offer_type, "spinStake") &&
    !casinoOfferTypeUsesFieldGroup(formState.offer_type, "wagering");

  if (rewardWageringApplies) {
    const derivedTarget = getCasinoRewardWagerTargetResult(formState);
    return derivedTarget.value ?? formState.wager_target;
  }

  return formState.wager_target;
}

function getDerivedRequiredSpins(formState: CasinoOfferFormState): string {
  const result = calculateSpinsRequired({
    wagerTarget: getCasinoEffectiveWagerTargetForSpins(formState),
    spinStake: formState.spin_stake,
  });
  return result.actionableSpins === null ? "" : String(result.actionableSpins);
}

function getCasinoWagerBase(formState: CasinoOfferFormState): CasinoWagerBase {
  const normalizedOfferType = normalizeCasinoOfferType(formState.offer_type);
  if (normalizedOfferType === "Fixed Wagering Requirement" || normalizedOfferType === "Wagering / Turnover Challenge") {
    return "fixed_amount";
  }
  if (normalizedOfferType === "Deposit And Bonus Wagering") {
    return formState.cash_stake.trim() ? "deposit_plus_bonus" : "bonus";
  }
  if (normalizedOfferType === "Wager To Earn Reward") {
    return formState.bonus_amount.trim() ? "bonus" : "cash_stake";
  }
  if (normalizedOfferType === "No-Deposit Bonus / Bonus Credit") {
    return "bonus";
  }
  return formState.bonus_amount.trim() ? "bonus" : "cash_stake";
}

function getStoredCasinoWagerBase(formState: CasinoOfferFormState): string {
  const base = getCasinoWagerBase(formState);
  switch (base) {
    case "bonus":
      return "Bonus";
    case "deposit":
      return "Deposit";
    case "deposit_plus_bonus":
      return "DepositPlusBonus";
    case "cash_stake":
      return "CashStake";
    case "fixed_amount":
      return "FixedAmount";
    case "custom":
      return "Custom";
    case "converted_reward":
      return "ConvertedReward";
  }
}

function getStoredCasinoRewardType(formState: CasinoOfferFormState): string {
  const rewardType = getCasinoOfferCapabilities(formState.offer_type).rewardType;
  switch (rewardType) {
    case "bonus_credit":
      return "BonusCredit";
    case "free_spins":
      return "FreeSpins";
    case "free_play":
      return "FreePlay";
    case "cashback":
      return "Cashback";
    case "refund":
      return "Refund";
    case "cash":
      return "Cash";
    case "mystery":
      return "Mystery";
    case "custom":
      return "Custom";
    case "none":
      return "";
  }
}

function getCasinoWagerTargetResult(formState: CasinoOfferFormState): CasinoCalculationMoneyResult {
  const base = getCasinoWagerBase(formState);
  return calculateWagerTarget({
    base,
    bonusAmount: formState.bonus_amount,
    cashStake: formState.cash_stake,
    depositAmount: formState.cash_stake,
    fixedAmount: formState.wager_target,
    multiplier: formState.wager_multiplier,
  });
}

function getCasinoRewardWagerTargetResult(formState: CasinoOfferFormState): CasinoCalculationMoneyResult {
  return calculateRewardWagerTarget({
    rewardAmount: formState.free_spins_value,
    multiplier: formState.wager_multiplier,
  });
}

function getCasinoSpinsRequiredResult(formState: CasinoOfferFormState): CasinoSpinCalculationResult {
  return calculateSpinsRequired({
    wagerTarget: getCasinoEffectiveWagerTargetForSpins(formState),
    spinStake: formState.spin_stake,
  });
}

function getCasinoRewardSpinsRequiredResult(formState: CasinoOfferFormState): CasinoSpinCalculationResult {
  const derivedRewardTarget = getCasinoRewardWagerTargetResult(formState);
  return calculateSpinsRequired({
    wagerTarget: derivedRewardTarget.value ?? formState.wager_target,
    spinStake: formState.spin_stake,
  });
}

function getDerivedWagerTarget(formState: CasinoOfferFormState): string {
  const result = getCasinoWagerTargetResult(formState);
  return result.value === null ? "" : result.value.toFixed(2);
}

function getDerivedRewardWagerTarget(formState: CasinoOfferFormState): string {
  const result = getCasinoRewardWagerTargetResult(formState);
  return result.value === null ? "" : result.value.toFixed(2);
}

function applyDerivedRewardWagerTarget(current: CasinoOfferFormState): CasinoOfferFormState {
  const derivedTarget = getDerivedRewardWagerTarget(current);
  if (!derivedTarget) {
    return current;
  }

  return {
    ...current,
    wager_target: derivedTarget,
  };
}

function applyDerivedWagerTarget(current: CasinoOfferFormState): CasinoOfferFormState {
  const derivedTarget = getDerivedWagerTarget(current);
  if (!derivedTarget) {
    return current;
  }

  return {
    ...current,
    wager_target: derivedTarget,
  };
}

function getCasinoPositiveOutcomeLabel(
  offerType: string,
  result: string
): string {
  const normalizedOfferType = normalizeCasinoOfferType(offerType);
  if (rewardCampaignOfferTypes.has(normalizedOfferType)) {
    return result === "Pending" ? "Spins convert well" : "Spins converted well";
  }
  if (normalizedOfferType === "Cashback / Loss Back") {
    return result === "Pending" ? "Cashback lands" : "Cashback landed";
  }
  if (wageringCampaignOfferTypes.has(normalizedOfferType)) {
    return result === "Pending" ? "Offer converts well" : "Offer converted well";
  }
  return result === "Pending" ? "Campaign ends positive" : "Campaign ended positive";
}

function getCasinoResultLabel(offerType: string, result: string): string {
  const normalizedOfferType = normalizeCasinoOfferType(offerType);
  if (result === "Pending") {
    if (normalizedOfferType === "Cashback / Loss Back") {
      return "Pending cashback";
    }
    if (normalizedOfferType === "Risk-Free / Refund") {
      return "Pending risk-free outcome";
    }
    if (rewardCampaignOfferTypes.has(normalizedOfferType)) {
      return "Pending reward outcome";
    }
    if (wageringCampaignOfferTypes.has(normalizedOfferType)) {
      return "Pending offer outcome";
    }
    return "Pending";
  }

  if (result === "Win") {
    if (normalizedOfferType === "Cashback / Loss Back") {
      return "Cashback landed";
    }
    if (normalizedOfferType === "Risk-Free / Refund") {
      return "Refund returned";
    }
    if (rewardCampaignOfferTypes.has(normalizedOfferType)) {
      return "Reward converted";
    }
    if (wageringCampaignOfferTypes.has(normalizedOfferType)) {
      return "Offer converted";
    }
  }

  if (result === "Lose") {
    if (normalizedOfferType === "Cashback / Loss Back") {
      return "Cashback missed";
    }
    if (normalizedOfferType === "Risk-Free / Refund") {
      return "Refund missed";
    }
    if (rewardCampaignOfferTypes.has(normalizedOfferType)) {
      return "Reward missed";
    }
    if (wageringCampaignOfferTypes.has(normalizedOfferType)) {
      return "Offer missed";
    }
  }

  if (result === "Mixed") {
    return "Mixed result";
  }

  return result;
}

function getCasinoNegativeOutcomeLabel(
  offerType: string,
  result: string
): string {
  const normalizedOfferType = normalizeCasinoOfferType(offerType);
  if (rewardCampaignOfferTypes.has(normalizedOfferType)) {
    return result === "Pending" ? "Spins underperform" : "Spins underperformed";
  }
  if (normalizedOfferType === "Cashback / Loss Back") {
    return result === "Pending" ? "Cashback misses" : "Cashback missed";
  }
  if (wageringCampaignOfferTypes.has(normalizedOfferType)) {
    return result === "Pending" ? "Offer underperforms" : "Offer underperformed";
  }
  return result === "Pending" ? "Campaign ends negative" : "Campaign ended negative";
}

function getMissingRequiredFields(formState: CasinoOfferFormState): string[] {
  const missing: string[] = [];
  if (!formState.offer_name.trim()) {
    missing.push("Offer name");
  }
  if (!formState.date_started.trim()) {
    missing.push("Date started");
  }
  if (!formState.bookmaker.trim()) {
    missing.push("Bookmaker");
  }
  if (!formState.offer_type.trim()) {
    missing.push("Offer type");
  }
  return missing;
}

function getMissingCampaignFields(
  formState: CasinoOfferFormState,
  options: { includeDraftFields?: boolean } = {}
): string[] {
  if (!options.includeDraftFields && casinoPlaceholderStatuses.has(formState.status)) {
    return [];
  }

  const missing: string[] = [];
  const requiredFields = new Set(getCasinoOfferRequiredFields(formState.offer_type));

  if (requiredFields.has("cash_stake") && !formState.cash_stake.trim()) {
    missing.push("Cash stake");
  }

  if (requiredFields.has("credit_amount") && !formState.credit_amount.trim()) {
    missing.push(getCreditAmountLabel(formState.offer_type));
  }

  if (requiredFields.has("bonus_amount") && !formState.bonus_amount.trim()) {
    missing.push("Bonus amount");
  }

  if (requiredFields.has("wager_multiplier") && !formState.wager_multiplier.trim()) {
    missing.push("Wager multiplier");
  }

  if (requiredFields.has("wager_target") && !formState.wager_target.trim()) {
    missing.push("Wager target");
  }

  if (
    requiredFields.has("spin_stake") &&
    isCasinoFieldInTab(formState, "spin_stake", "campaign") &&
    !formState.spin_stake.trim()
  ) {
    missing.push("Spin stake");
  }

  return missing;
}

function isCasinoRequiredFieldFilled(
  formState: CasinoOfferFormState,
  field: ReturnType<typeof getCasinoOfferRequiredFields>[number]
): boolean {
  switch (field) {
    case "cash_stake":
      return Boolean(formState.cash_stake.trim());
    case "credit_amount":
      return Boolean(formState.credit_amount.trim());
    case "bonus_amount":
      return Boolean(formState.bonus_amount.trim());
    case "wager_multiplier":
      return Boolean(formState.wager_multiplier.trim());
    case "wager_target":
      return Boolean(formState.wager_target.trim());
    case "required_spins":
      return Boolean(
        formState.required_spins.trim() ||
          getDerivedRequiredSpins(formState)
      );
    case "spin_stake":
      return Boolean(formState.spin_stake.trim());
    case "free_spins_awarded":
      return Boolean(formState.free_spins_awarded.trim());
    case "free_spins_value":
      return Boolean(formState.free_spins_value.trim());
    default:
      return false;
  }
}

function isCasinoFieldInTab(
  formState: CasinoOfferFormState,
  field: ReturnType<typeof getCasinoOfferRequiredFields>[number],
  tabId: "campaign" | "reward"
): boolean {
  const campaignFields = new Set([
    "cash_stake",
    "credit_amount",
    "bonus_amount",
    "wager_multiplier",
    "wager_target",
  ]);
  if (field === "spin_stake" && casinoOfferTypeUsesFieldGroup(formState.offer_type, "wagering")) {
    return tabId === "campaign";
  }
  const rewardFields = new Set([
    "required_spins",
    "spin_stake",
    "free_spins_awarded",
    "free_spins_value",
  ]);

  return tabId === "campaign" ? campaignFields.has(field) : rewardFields.has(field);
}

function getCasinoTabRequiredFields(
  formState: CasinoOfferFormState,
  tabId: "campaign" | "reward"
): ReturnType<typeof getCasinoOfferRequiredFields> {
  return getCasinoOfferRequiredFields(formState.offer_type).filter((field) =>
    isCasinoFieldInTab(formState, field, tabId)
  );
}

function isCasinoRequiredTabComplete(
  formState: CasinoOfferFormState,
  tabId: "campaign" | "reward"
): boolean {
  const tabFields = getCasinoTabRequiredFields(formState, tabId);
  if (tabFields.length > 0) {
    return tabFields.every((field) => isCasinoRequiredFieldFilled(formState, field));
  }

  if (tabId === "reward" && casinoOfferTypeUsesTab(formState.offer_type, "reward")) {
    return Boolean(formState.free_spins_value.trim());
  }

  return false;
}

function getMissingRewardFields(
  formState: CasinoOfferFormState,
  options: { includeDraftFields?: boolean } = {}
): string[] {
  if (!options.includeDraftFields && casinoPlaceholderStatuses.has(formState.status)) {
    return [];
  }

  const missing: string[] = [];
  const requiredFields = new Set(getCasinoOfferRequiredFields(formState.offer_type));

  if (requiredFields.has("required_spins")) {
    if (!formState.required_spins.trim() && !getDerivedRequiredSpins(formState)) {
      missing.push("Required spins");
    }
  }

  if (
    requiredFields.has("spin_stake") &&
    isCasinoFieldInTab(formState, "spin_stake", "reward") &&
    !formState.spin_stake.trim()
  ) {
    missing.push("Spin stake");
  }

  if (requiredFields.has("free_spins_awarded") && !formState.free_spins_awarded.trim()) {
    missing.push("Free spins awarded");
  }

  if (requiredFields.has("free_spins_value") && !formState.free_spins_value.trim()) {
    missing.push(getRewardValueLabel(formState.offer_type));
  }

  return missing;
}

function parseCasinoAmount(value: string | null | undefined): number {
  if (!value?.trim()) {
    return 0;
  }

  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCasinoMoneyInput(value: string): string {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) {
    return "";
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : value;
}

function getCurrentDateTimeLocalValue(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}`;
}

function truncateHeaderTitle(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 4)).trimEnd()} ...`;
}

export function CasinoOfferWorkflowShell({ profileId, initialQuery = "", initialIssueFilter, initialRecordId, feeReviewContext }: { profileId: string; initialQuery?: string; initialIssueFilter?: string; initialRecordId?: string; feeReviewContext?: FeeReviewResolutionContext }) {
  const { catalogue: bookmakerCatalogue, displaySettings: bookmakerDisplaySettings } =
    useBookmakerCatalogue(profileId);
  const [guidedAccessMode] = useProfileGuidedAccessMode(profileId);
  const guidedAccessEnabled = isGuidedAccessEnabled(guidedAccessMode);
  const [rows, setRows] = useState<CasinoOfferRecord[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [accountAuthorities, setAccountAuthorities] = useState<AccountAuthorityRecord[]>([]);
  const [commonBetCombos, setCommonBetCombos] = useState<CommonBetCombo[]>([]);
  const [selectedComboId, setSelectedComboId] = useState("");
  const [lookupValues, setLookupValues] = useState<LookupValueRecord[]>([]);
  const [trackerSettings, setTrackerSettings] = useState<TrackerSettingsRecord | null>(null);
  const [isTrackerRangeSaving, setIsTrackerRangeSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workflowVisible, setWorkflowVisible] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddReturnValues, setQuickAddReturnValues] =
    useState<CasinoFreeSpinsQuickAddValues | null>(null);
  const [tableCollapsed, setTableCollapsed] = usePersistedBoolean(
    `openforge-ledger-collapsed:${profileId}:casino-offers`,
    false
  );
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<CasinoColumnKey>>(
    () => new Set(defaultVisibleCasinoColumns)
  );
  const [columnWidths, setColumnWidths] = useState<Partial<Record<CasinoColumnKey, number>>>(
    defaultCasinoColumnWidths
  );
  const [tableFilters, setTableFilters] = usePersistedState<CasinoTableFilterState>(
    `openforge-ledger-table-filters:${profileId}:casino-offers`,
    {
      ...emptyTableFilters,
      issue_type: initialIssueFilter === "outcome-needed" ? "outcome-needed" : initialIssueFilter === "all-issues" ? "all-issues" : "any",
    },
    Boolean(initialIssueFilter)
  );
  useEffect(() => {
    const supported = new Set<CasinoIssueFilter>([
      "all-issues",
      "offer-unplaced",
      "no-settle-date",
      "outcome-needed",
      "final-value-needed",
    ]);
    if (initialIssueFilter && supported.has(initialIssueFilter as CasinoIssueFilter)) {
      setTableFilters((current) => ({
        ...current,
        issue_type: initialIssueFilter as CasinoIssueFilter,
      }));
    }
  }, [initialIssueFilter, setTableFilters]);
  const [tableSort, setTableSort] = useState<CasinoTableSort | null>(null);
  const [formState, setFormState] = useState<CasinoOfferFormState>(createBlankForm);
  const [pristineFormState, setPristineFormState] =
    useState<CasinoOfferFormState>(createBlankForm);
  const [outcomeModalState, setOutcomeModalState] = useState<CasinoOutcomeModalState | null>(null);
  const [tableMode, setTableMode] = usePersistedState<CasinoOfferTableMode>(
    `openforge-ledger-table-mode:${profileId}:casino-offers`,
    "recent",
    Boolean(initialIssueFilter)
  );
  const [query, setQuery] = useState(initialQuery);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showOfferIdentityValidation, setShowOfferIdentityValidation] = useState(false);
  const [settledEditEnabled, setSettledEditEnabled] = useState(false);
  const [settledDeleteGuardRowId, setSettledDeleteGuardRowId] = useState<string | null>(null);
  const [settledDeleteReason, setSettledDeleteReason] = useState("");
  const [activeEditorTabId, setActiveEditorTabId] = useState<CasinoEditorTabId>("setup");
  const [guidedEntryDismissed, setGuidedEntryDismissed] = useState(false);
  const [activeMoneyKeypadField, setActiveMoneyKeypadField] = useState<CasinoMoneyFieldKey | null>(null);
  const [moneyKeypadPrimedField, setMoneyKeypadPrimedField] = useState<CasinoMoneyFieldKey | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isPersisting, setIsPersisting] = useState(false);
  const editorRef = useRef<HTMLElement | null>(null);
  const quickAddRef = useRef<HTMLDivElement | null>(null);
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
      casinoTableColumns.filter((column) =>
        visibleColumnKeys.has(column.key as CasinoColumnKey)
      ),
    [visibleColumnKeys]
  );
  const hiddenColumnCount = useMemo(
    () =>
      Array.from(hideableCasinoColumnKeys).filter((columnKey) => !visibleColumnKeys.has(columnKey))
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

  const hasOpenModal = workflowVisible || isQuickAddOpen || isFilterModalOpen || Boolean(outcomeModalState);

  useToastDismiss(statusMessage, clearStatusMessage);
  useBodyScrollLock(hasOpenModal);
  useDialogFocusLifecycle(workflowVisible, editorRef);
  useDialogFocusLifecycle(isQuickAddOpen, quickAddRef);

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
      const url = `${apiBaseUrl}/profiles/${profileId}/casino-offers`;
      const cachedRows = readCachedJson<CasinoOfferRecord[]>(
        url,
        TRACKER_STALE_WHILE_REFRESH_MS
      );
      if (cachedRows && requestId === loadRowsRequestIdRef.current) {
        setRows(cachedRows);
        setIsInitialLoading(false);
      }

      const nextRows = await fetchJsonAndCache<CasinoOfferRecord[]>(url);
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
          nextRows.some((row) => row.casino_offer_id === nextSelectedCandidate)
            ? nextSelectedCandidate
            : null;
        setSelectedId(selected);
        if (selected) {
          isCreatingDraftRef.current = false;
          setActiveEditorTabId("setup");
          const activeRecord = nextRows.find((row) => row.casino_offer_id === selected);
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
    },
    [profileId, startTransition]
  );

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

  const loadCommonBetCombos = useCallback(async () => {
    const response = await fetch(`${apiBaseUrl}/fund-manager/common-bet-combos?active_only=true`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Unable to load common bet combos");
    }
    const nextRows = (await response.json()) as CommonBetCombo[];
    setCommonBetCombos(nextRows.filter((row) => row.ledger_type === "Casino"));
  }, []);

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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void Promise.all([loadRows(ignoreInitialRecordIdRef.current ? undefined : initialRecordId), loadAccountAuthorities(), loadLookupValues(), loadTrackerSettings(), loadCommonBetCombos()]).catch(
        (error: Error) => {
          setIsInitialLoading(false);
          setErrorMessage(error.message);
          setStatusMessage("Casino-offer workflow could not be loaded.");
        }
      );
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [initialRecordId, loadRows, loadAccountAuthorities, loadLookupValues, loadTrackerSettings, loadCommonBetCombos]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.casino_offer_id === selectedId) ?? null,
    [rows, selectedId]
  );
  const isSettledRow = selectedRow?.status === "Settled";
  const isSettledReadOnly = Boolean(isSettledRow && !settledEditEnabled);
  const normalizedOfferType = normalizeCasinoOfferType(formState.offer_type);
  const offerCapabilities = useMemo(
    () => getCasinoOfferCapabilities(normalizedOfferType),
    [normalizedOfferType]
  );
  const showsCampaignSection = casinoOfferTypeUsesTab(normalizedOfferType, "campaign");
  const showsRewardSection = casinoOfferTypeUsesTab(normalizedOfferType, "reward");
  const showsCashStake = casinoOfferTypeUsesFieldGroup(normalizedOfferType, "cashStake");
  const showsWagerFields = casinoOfferTypeUsesFieldGroup(normalizedOfferType, "wagering");
  const showsBonusAmountField = casinoOfferTypeUsesFieldGroup(normalizedOfferType, "bonusAmount");
  const showsCreditAmountField = casinoOfferTypeUsesFieldGroup(normalizedOfferType, "creditAmount");
  const showsRequiredSpinFields = casinoOfferTypeUsesFieldGroup(normalizedOfferType, "requiredSpins");
  const showsSpinStakeField = casinoOfferTypeUsesFieldGroup(normalizedOfferType, "spinStake");
  const showsAwardedSpinsField = casinoOfferTypeUsesFieldGroup(normalizedOfferType, "awardedSpins");
  const showsRewardValueField = casinoOfferTypeUsesFieldGroup(normalizedOfferType, "rewardValue");
  const casinoRequiredFields = useMemo(
    () => new Set(getCasinoOfferRequiredFields(normalizedOfferType)),
    [normalizedOfferType]
  );
  const showsWagerMultiplierField = showsWagerFields && casinoRequiredFields.has("wager_multiplier");
  const showsRewardWageringControls =
    offerCapabilities.hasRewardWagering && showsRewardValueField && showsSpinStakeField && !showsWagerFields;
  const derivedWagerTargetResult = getCasinoWagerTargetResult(formState);
  const derivedRewardWagerTargetResult = getCasinoRewardWagerTargetResult(formState);
  const derivedSpinsRequiredResult = getCasinoSpinsRequiredResult(formState);
  const derivedRewardSpinsRequiredResult = getCasinoRewardSpinsRequiredResult(formState);
  const derivedRequiredSpins = getDerivedRequiredSpins(formState);
  const resultOptions = useMemo(
    () => getCasinoResultOptions(formState.offer_type),
    [formState.offer_type]
  );
  const missingOfferIdentityFields = useMemo(() => getMissingRequiredFields(formState), [formState]);
  const missingCampaignFields = useMemo(() => getMissingCampaignFields(formState), [formState]);
  const missingRewardFields = useMemo(() => getMissingRewardFields(formState), [formState]);
  const missingSettlementFields = useMemo(() => getMissingCasinoSettlementFields(formState), [formState]);
  const guidedCampaignFields = useMemo(
    () => getMissingCampaignFields(formState, { includeDraftFields: true }),
    [formState]
  );
  const guidedRewardFields = useMemo(
    () => getMissingRewardFields(formState, { includeDraftFields: true }),
    [formState]
  );
  const offerSetupComplete = missingOfferIdentityFields.length === 0;
  const campaignUnlocked = offerSetupComplete && Boolean(formState.offer_type.trim()) && showsCampaignSection;
  const rewardUnlocked = offerSetupComplete && Boolean(formState.offer_type.trim()) && showsRewardSection;
  const campaignStepComplete = isCasinoRequiredTabComplete(formState, "campaign");
  const rewardStepComplete = isCasinoRequiredTabComplete(formState, "reward");
  const offerIdentityValidationActive = showOfferIdentityValidation;
  const displayedValue = getDisplayedCasinoValueForForm(formState);
  const displayedValueLabel = getDisplayedCasinoValueLabelForForm(formState);
  const hasResolvedCasinoValue = Boolean(formState.calc_net_pnl.trim() || formState.final_net_pnl.trim());
  const hasAdvancedCasinoContent = Boolean(
    formState.calc_net_pnl.trim() ||
      formState.user_notes.trim() ||
      selectedRow?.calculation_notes.length
  );
  const showsAdvancedEditorTab =
    hasAdvancedCasinoContent || normalizeCasinoOfferType(formState.offer_type) === "Other / Custom";
  const quickSettlementOptions = useMemo(
    () => resultOptions.filter((option) => option !== "Pending"),
    [resultOptions]
  );
  const casinoEditorTabs = useMemo<LedgerEditorTabDefinition[]>(
    () => {
      const tabs: LedgerEditorTabDefinition[] = [
      {
        id: "setup",
        label: "Offer Setup",
        requiredIssueCount: offerIdentityValidationActive ? missingOfferIdentityFields.length : 0,
        status:
          offerIdentityValidationActive && missingOfferIdentityFields.length > 0
            ? "invalid"
            : offerSetupComplete
              ? "complete"
              : "neutral",
      },
      ];

      if (showsCampaignSection) {
        tabs.push({
          id: "campaign",
          label: "Wagering",
          requiredIssueCount:
            offerIdentityValidationActive && campaignUnlocked ? missingCampaignFields.length : 0,
          status: !campaignUnlocked
            ? "locked"
            : offerIdentityValidationActive && missingCampaignFields.length > 0
              ? "invalid"
              : campaignStepComplete
                ? "complete"
                : "neutral",
        });
      }

      if (showsRewardSection) {
        tabs.push({
          id: "reward",
          label: "Reward",
          requiredIssueCount:
            offerIdentityValidationActive && rewardUnlocked ? missingRewardFields.length : 0,
          status: !rewardUnlocked
            ? "locked"
            : offerIdentityValidationActive && missingRewardFields.length > 0
              ? "invalid"
              : rewardStepComplete
                ? "complete"
                : "neutral",
        });
      }

      tabs.push({
        id: "settlement",
        label: "Settlement",
        attentionState: getSettlementTabAttentionState({
          result: formState.result,
          settlementDate: formState.date_started,
          status: formState.status,
        }),
        requiredIssueCount: offerIdentityValidationActive ? missingSettlementFields.length : 0,
        status:
          offerIdentityValidationActive && missingSettlementFields.length > 0
            ? "invalid"
            : formState.status === "Settled" && missingSettlementFields.length === 0
              ? "complete"
              : "neutral",
      });

      if (showsAdvancedEditorTab) {
        tabs.push({
          id: "advanced",
          label: "Advanced",
          status: "neutral",
        });
      }

      return tabs;
    },
    [
      campaignUnlocked,
      campaignStepComplete,
      formState.date_started,
      formState.result,
      formState.status,
      missingCampaignFields.length,
      missingOfferIdentityFields.length,
      missingRewardFields.length,
      missingSettlementFields.length,
      offerIdentityValidationActive,
      offerSetupComplete,
      rewardUnlocked,
      rewardStepComplete,
      showsCampaignSection,
      showsAdvancedEditorTab,
      showsRewardSection,
    ]
  );
  const safeActiveEditorTabId = casinoEditorTabs.some(
    (tab) => tab.id === activeEditorTabId && tab.status !== "locked"
  )
    ? activeEditorTabId
    : (casinoEditorTabs.find((tab) => tab.status !== "locked")?.id as
        | CasinoEditorTabId
        | undefined) ?? "setup";
  const navigableCasinoEditorTabs = casinoEditorTabs.filter((tab) => tab.status !== "locked");
  const activeCasinoEditorTabIndex = Math.max(
    0,
    navigableCasinoEditorTabs.findIndex((tab) => tab.id === safeActiveEditorTabId)
  );
  const previousCasinoEditorTab =
    activeCasinoEditorTabIndex > 0
      ? navigableCasinoEditorTabs[activeCasinoEditorTabIndex - 1]
      : null;
  const nextCasinoEditorTab =
    activeCasinoEditorTabIndex >= 0 &&
    activeCasinoEditorTabIndex < navigableCasinoEditorTabs.length - 1
      ? navigableCasinoEditorTabs[activeCasinoEditorTabIndex + 1]
      : null;
  const activateCasinoEditorTab = useCallback((tabId: CasinoEditorTabId) => {
    setActiveEditorTabId(tabId);
  }, []);
  const displayedNumericValue =
    parseCasinoDisplayValue(displayedValue) ??
    (displayedValueLabel === getRewardValueLabel(formState.offer_type)
      ? parseCasinoDisplayValue(formState.free_spins_value)
      : null);
  const settlementNetSuggestion = useMemo(
    () =>
      calculateCasinoSettlementNetResult({
        cashReturned: formState.cash_returned,
        ownCashCommitted: formState.own_cash_committed,
        otherCosts: formState.settlement_other_costs,
        rewardConverted: formState.free_spins_value,
      }),
    [
      formState.cash_returned,
      formState.free_spins_value,
      formState.own_cash_committed,
      formState.settlement_other_costs,
    ]
  );
  const ownCashCommittedSuggestion = getCasinoOwnCashCommittedSuggestion(formState);
  const guidedEntry = useMemo(
    () =>
      getCasinoGuidedEntry({
        formState,
        missingCampaignFields: guidedCampaignFields,
        missingOfferIdentityFields,
        missingRewardFields: guidedRewardFields,
        missingSettlementFields,
      }),
    [formState, guidedCampaignFields, guidedRewardFields, missingOfferIdentityFields, missingSettlementFields]
  );
  const casinoGuidedFallbackMessages = useMemo<Record<CasinoGuidedFieldKey, string>>(
    () => ({
      bonus_amount: "Enter The Bonus Amount.",
      bookmaker: "Choose The Bookmaker.",
      cash_stake: "Enter The Cash Stake.",
      credit_amount: "Enter The Credit Amount.",
      date_started: "Choose The Start Date.",
      final_net_pnl: "Confirm The Net Result.",
      free_spins_awarded: "Enter The Free Spins Awarded.",
      free_spins_value: "Enter The Free-Spin Value.",
      offer_name: "Add The Offer Name As Shown.",
      offer_type: "Choose The Offer Type.",
      required_spins: "Enter The Required Spins.",
      result: "Confirm The Outcome.",
      spin_stake: "Enter The Spin Stake.",
      wager_multiplier: "Enter The Wager Multiplier.",
      wager_target: "Enter The Wager Target.",
    }),
    []
  );
  const safeGuidedEntry = useMemo(() => {
    if (guidedEntry.state === "complete") {
      return guidedEntry;
    }
    const nextRequiredField = guidedEntry.nextRequiredField ?? "offer_name";
    return {
      ...guidedEntry,
      nextRequiredField,
      message:
        guidedEntry.message.trim() ||
        casinoGuidedFallbackMessages[nextRequiredField] ||
        "Continue The Guided Workflow.",
    };
  }, [casinoGuidedFallbackMessages, guidedEntry]);
  const guidedEntryVisible =
    workflowVisible && guidedAccessEnabled && !guidedEntryDismissed && safeGuidedEntry.state !== "complete";
  const guidedEntryMessageId = "casino-guided-entry-message";
  const guidedEntryTargetTabId = safeGuidedEntry.nextRequiredField
    ? getCasinoGuidedFieldTab(formState, safeGuidedEntry.nextRequiredField)
    : null;
  const guidedEntryNeedsTabJump =
    guidedEntryTargetTabId !== null && guidedEntryTargetTabId !== safeActiveEditorTabId;
  const guidedEntryTargetTabIndex = guidedEntryTargetTabId
    ? casinoEditorTabs.findIndex((tab) => tab.id === guidedEntryTargetTabId)
    : -1;
  const guidedEntryTargetTabLabel = guidedEntryTargetTabId
    ? casinoGuidedTabLabels[guidedEntryTargetTabId]
    : "";
  const guidedEntryMessageText =
    safeGuidedEntry.message.trim() ||
    (safeGuidedEntry.nextRequiredField
      ? casinoGuidedFallbackMessages[safeGuidedEntry.nextRequiredField]
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
  const getGuidedFieldClass = useCallback(
    (field: CasinoGuidedFieldKey, extraClass = "") => {
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
    (field: CasinoGuidedFieldKey) => ({
      "data-guided-field": field,
    }),
    []
  );
  const getGuidedDescribedBy = useCallback(
    (field: CasinoGuidedFieldKey, existing?: string) => {
      const ids = [
        existing,
        guidedEntryVisible && safeGuidedEntry.nextRequiredField === field ? guidedEntryMessageId : undefined,
      ].filter(Boolean);
      return ids.length ? ids.join(" ") : undefined;
    },
    [guidedEntryVisible, safeGuidedEntry.nextRequiredField]
  );
  const focusGuidedEntryTarget = useCallback(() => {
    const nextField = safeGuidedEntry.nextRequiredField;
    if (!nextField) return;
    const nextTab = getCasinoGuidedFieldTab(formState, nextField);
    activateCasinoEditorTab(nextTab);
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
  }, [activateCasinoEditorTab, formState, safeGuidedEntry.nextRequiredField]);
  const renderGuidedEntryMessage = useCallback((message: string) => {
    const safeMessage = message.trim() || "Continue The Guided Workflow.";
    const targetTerms = [
      "Start Date",
      "Offer Name",
      "Settlement Date",
      "Offer Type",
      "Bookmaker",
      "Campaign",
      "Wagering",
      "Reward",
      "Outcome",
      "Net Result",
      "Cash Stake",
      "Bonus Amount",
      "Wager Multiplier",
      "Wager Target",
      "Required Spins",
      "Spin Stake",
      "Free Spins Awarded",
      "Converted Win Amount",
      "Converted Free-Play Amount",
      "Returned Credit Amount",
      "Converted Reward Amount",
      "Cashback Amount",
      "Refund / Credit Amount",
      "Free-Play Amount",
      "Credit Amount",
    ];
    const pattern = new RegExp(`(${targetTerms.join("|")})`, "g");
    const parts = safeMessage.split(pattern).filter(Boolean);
    if (parts.length === 0) {
      return <>{safeMessage}</>;
    }
    return (
      <>
        {parts.map((part, index) =>
          targetTerms.includes(part) ? (
            <span className="guided-entry-token guided-entry-token-field" key={`${part}-${index}`}>
              {part}
            </span>
          ) : (
            <span key={`${part}-${index}`}>{part}</span>
          )
        )}
      </>
    );
  }, []);
  const renderSettledLockAction = useCallback(
    (sectionId: CasinoEditorTabId) => {
      if (!selectedId) {
        return null;
      }

      return isSettledReadOnly ? (
        <button
          className="section-lock-chip section-lock-chip-action"
          data-pd-id={`casino-offers.editor.${sectionId}.edit-settled-row`}
          onClick={() => setSettledEditEnabled(true)}
          type="button"
        >
          EDIT
        </button>
      ) : (
        <span className="section-lock-chip" data-pd-id={`casino-offers.editor.${sectionId}.editing-state`}>
          EDITING
        </span>
      );
    },
    [isSettledReadOnly, selectedId]
  );
  const renderEditorSectionAside = useCallback(
    (sectionId: CasinoEditorTabId, extra?: ReactNode) => {
      const editState = renderSettledLockAction(sectionId);
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
  const quickView = useMemo(() => {
    const rangeRows = initialIssueFilter
      ? rows
      : rows.filter((row) =>
          isDateWithinResolvedRange(getCasinoRangeAnchor(row), resolvedDateRange)
        );
    const rewardLedRows = rangeRows.filter((row) => casinoOfferTypeUsesTab(row.offer_type, "reward"));
    const wageringRows = rangeRows.filter((row) => casinoOfferTypeUsesTab(row.offer_type, "campaign"));
    const cashbackRows = rangeRows.filter((row) => normalizeCasinoOfferType(row.offer_type) === "Cashback / Loss Back");
    const prospectingRows = rangeRows.filter((row) => casinoPlaceholderStatuses.has(row.status));
    const settlingRows = rangeRows.filter((row) => row.date_settling.trim());
    const totalResolvedValue = rangeRows.reduce(
      (sum, row) =>
        sum +
        parseCasinoAmount(row.resolved_net_pnl ?? row.final_net_pnl ?? row.calc_net_pnl),
      0
    );

    return {
      openCount: rangeRows.filter((row) => row.counts_as_open).length,
      overdueCount: rangeRows.filter((row) => row.is_overdue).length,
      prospectingCount: prospectingRows.length,
      settlingCount: settlingRows.length,
      rewardLedCount: rewardLedRows.length,
      wageringCount: wageringRows.length,
      cashbackCount: cashbackRows.length,
      totalResolvedValue,
    };
  }, [initialIssueFilter, resolvedDateRange, rows]);
  const quickViewRangeContext = initialIssueFilter
    ? "Action filter: all dates"
    : formatResolvedDateRange(resolvedDateRange);
  const quickViewRangeDetail = initialIssueFilter
    ? "Action filter: all dates"
    : formatResolvedDateRangeContext(resolvedDateRange);

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
  const quickAddBookmakerOptions = useMemo(
    () => dedupeOptions(getAccountNamesByType(accountAuthorities, "Bookie")),
    [accountAuthorities]
  );

  const selectedComboCoverage = useMemo(() => {
    const combo = commonBetCombos.find((row) => row.preset_id === selectedComboId);
    if (!combo) return [];
    const knownBookmakers = combo.bookmakers?.length
      ? combo.bookmakers
      : combo.bookmaker
        ? [combo.bookmaker]
        : [];
    return resolveCasinoBookmakerCoverage({ knownBookmakers, accountAuthorities });
  }, [accountAuthorities, commonBetCombos, selectedComboId]);

  function applyCommonBetCombo(presetId: string) {
    setSelectedComboId(presetId);
    if (!presetId) return;
    if (selectedId || formState.casino_offer_id) {
      setErrorMessage("Common combos can only be applied to a new casino draft.");
      return;
    }
    const combo = commonBetCombos.find((row) => row.preset_id === presetId);
    if (!combo) {
      setErrorMessage("That common combo is no longer available. Refresh and try again.");
      return;
    }
    const selectable = resolveCasinoBookmakerCoverage({
      knownBookmakers: combo.bookmakers?.length
        ? combo.bookmakers
        : combo.bookmaker
          ? [combo.bookmaker]
          : [],
      accountAuthorities,
    }).filter((row) => row.selectable);
    const knownCount = combo.bookmakers?.length || (combo.bookmaker ? 1 : 0);
    if (knownCount > 0 && selectable.length === 0) {
      setErrorMessage(`All known bookmakers for ${combo.name} are unavailable on this profile.`);
      return;
    }
    const nextBookmaker = selectable.length === 1 ? selectable[0].bookmaker : "";
    setErrorMessage("");
    setFormState((current) => {
      const nextState = {
        ...applyCasinoOfferTypeDefaults(current, combo.offer_type || current.offer_type),
        bookmaker: nextBookmaker || (knownCount > 0 ? "" : current.bookmaker),
        offer_name: combo.offer_name || current.offer_name,
        game: combo.game || current.game,
        cash_stake: combo.cash_stake || current.cash_stake,
        credit_amount: combo.credit_amount || current.credit_amount,
        bonus_amount: combo.bonus_amount || current.bonus_amount,
        wager_multiplier: combo.wager_multiplier || current.wager_multiplier,
        required_spins: combo.required_spins || current.required_spins,
        spin_stake: combo.spin_stake || current.spin_stake,
        free_spins_awarded: combo.free_spins_awarded || current.free_spins_awarded,
        free_spins_value: combo.free_spins_value || current.free_spins_value,
      };
      return applySuggestedOwnCashCommitted(current, applyDerivedWagerTarget(nextState));
    });
    const choice = selectable.length > 1 ? ` Choose one of ${selectable.length} eligible bookmakers.` : "";
    const warning = selectable.find((row) => row.state === "warning");
    setStatusMessage(`${combo.name} applied to this unsaved casino draft.${choice}${warning ? ` ${warning.reason}.` : ""}`);
  }

  const offerTypeOptions = useMemo(
    () => getCasinoOfferTypeOptions(formState.offer_type),
    [formState.offer_type]
  );
  const normalizeMoneyField = (field: CasinoMoneyFieldKey) => {
    if (!casinoCurrencyKeypadFields.has(field)) {
      return;
    }
    setFormState((current) => {
      const nextValue = formatCasinoMoneyInput(current[field]);
      if (field === "free_spins_value") {
        return applyCasinoRewardValueChange(current, nextValue);
      }
      if (field === "cash_stake") {
        return applySuggestedOwnCashCommitted(
          current,
          applyDerivedWagerTarget({ ...current, cash_stake: nextValue })
        );
      }
      if (field === "bonus_amount") {
        return applyDerivedWagerTarget({ ...current, bonus_amount: nextValue });
      }

      return {
        ...current,
        [field]: nextValue,
      };
    });
  };
  const applyMoneyKeypadInput = (field: CasinoMoneyFieldKey, value: string) => {
    const shouldClearOnFirstEntry =
      moneyKeypadPrimedField === field && value !== "clear" && value !== "toggle-sign";
    setMoneyKeypadPrimedField(null);
    setFormState((current) => {
      const applyNextFieldValue = (nextValue: string): CasinoOfferFormState => {
        if (field === "free_spins_value") {
          return applyCasinoRewardValueChange(current, nextValue);
        }
        if (field === "cash_stake") {
          return applySuggestedOwnCashCommitted(
            current,
            applyDerivedWagerTarget({ ...current, cash_stake: nextValue })
          );
        }
        if (field === "bonus_amount") {
          return applyDerivedWagerTarget({ ...current, bonus_amount: nextValue });
        }
        if (field === "wager_multiplier") {
          const nextState = { ...current, wager_multiplier: nextValue };
          return casinoOfferTypeUsesFieldGroup(current.offer_type, "wagering")
            ? applyDerivedWagerTarget(nextState)
            : applyDerivedRewardWagerTarget(nextState);
        }
        return { ...current, [field]: nextValue };
      };
      const existing = shouldClearOnFirstEntry ? "" : current[field] ?? "";
      if (value === "clear") {
        return applyNextFieldValue("");
      }
      if (value === "toggle-sign") {
        const trimmed = existing.trim();
        const nextValue = trimmed.startsWith("-") ? trimmed.slice(1) : trimmed ? `-${trimmed}` : "-";
        return applyNextFieldValue(nextValue);
      }
      if (value === "." && existing.includes(".")) {
        return current;
      }
      const nextValue = `${existing}${value}`;
      return applyNextFieldValue(nextValue);
    });
  };
  const toggleMoneyKeypad = (field: CasinoMoneyFieldKey) => {
    const nextField = activeMoneyKeypadField === field ? null : field;
    setActiveMoneyKeypadField(nextField);
    setMoneyKeypadPrimedField(nextField);
  };
  const renderMoneyKeypad = (field: CasinoMoneyFieldKey) => (
    <div className="casino-money-keypad" data-pd-id={`casino-offers.money-keypad.${field}`}>
      {["7", "8", "9", "4", "5", "6", "1", "2", "3", "toggle-sign", "0", "."].map((key) => (
        <button
          aria-label={key === "toggle-sign" ? "Toggle amount sign" : `Enter ${key}`}
          className="casino-money-keypad-button"
          key={key}
          onClick={() => applyMoneyKeypadInput(field, key)}
          type="button"
        >
          {key === "toggle-sign" ? "±" : key}
        </button>
      ))}
      <button
        className="casino-money-keypad-button casino-money-keypad-wide"
        onClick={() => applyMoneyKeypadInput(field, "clear")}
        type="button"
      >
        Clear
      </button>
      <button
        className="casino-money-keypad-button casino-money-keypad-wide"
        onClick={() => {
          if (casinoCurrencyKeypadFields.has(field)) {
            normalizeMoneyField(field);
          }
          setActiveMoneyKeypadField(null);
        }}
        type="button"
      >
        Done
      </button>
    </div>
  );
  const normalizeOutcomeMoneyField = () => {
    setOutcomeModalState((current) =>
      current
        ? {
            ...current,
            final_net_pnl: formatCasinoMoneyInput(current.final_net_pnl),
          }
        : current
    );
  };

  const reviewRows = useMemo(() => {
    const nextRows = [...rows];

    if (feeReviewContext) {
      return nextRows.sort((left, right) =>
        left.casino_offer_id.localeCompare(right.casino_offer_id)
      );
    }

    if (tableMode === "prospecting") {
      return nextRows
        .filter((row) => casinoPlaceholderStatuses.has(row.status))
        .sort((left, right) => {
          const rightCreated = getComparableDate(right.created_at) ?? 0;
          const leftCreated = getComparableDate(left.created_at) ?? 0;
          return rightCreated - leftCreated;
        });
    }

    if (tableMode === "open") {
      return nextRows
        .filter((row) => row.counts_as_open)
        .sort((left, right) => {
          const leftSettles = getComparableDate(left.date_settling);
          const rightSettles = getComparableDate(right.date_settling);
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

    if (tableMode === "free-spins") {
      return nextRows
        .filter((row) => casinoOfferTypeUsesTab(row.offer_type, "reward"))
        .sort((left, right) => {
          if (left.counts_as_open !== right.counts_as_open) {
            return left.counts_as_open ? -1 : 1;
          }
          const rightCreated = getComparableDate(right.created_at) ?? 0;
          const leftCreated = getComparableDate(left.created_at) ?? 0;
          return rightCreated - leftCreated;
        });
    }

    if (tableMode === "wagering") {
      return nextRows
        .filter((row) => casinoOfferTypeUsesTab(row.offer_type, "campaign"))
        .sort((left, right) => {
          if (left.counts_as_open !== right.counts_as_open) {
            return left.counts_as_open ? -1 : 1;
          }
          const rightCreated = getComparableDate(right.created_at) ?? 0;
          const leftCreated = getComparableDate(left.created_at) ?? 0;
          return rightCreated - leftCreated;
        });
    }

    if (tableMode === "cashback") {
      return nextRows
        .filter((row) => normalizeCasinoOfferType(row.offer_type) === "Cashback / Loss Back")
        .sort((left, right) => {
          if (left.counts_as_open !== right.counts_as_open) {
            return left.counts_as_open ? -1 : 1;
          }
          const rightCreated = getComparableDate(right.created_at) ?? 0;
          const leftCreated = getComparableDate(left.created_at) ?? 0;
          return rightCreated - leftCreated;
        });
    }

    if (tableMode === "overdue") {
      return nextRows
        .filter((row) => row.is_overdue)
        .sort((left, right) => {
          const leftExpiry = getComparableDate(left.expiry_datetime);
          const rightExpiry = getComparableDate(right.expiry_datetime);
          if (leftExpiry === null && rightExpiry === null) {
            return 0;
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
        const leftSettles = getComparableDate(left.date_settling);
        const rightSettles = getComparableDate(right.date_settling);
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
    (columnKey: CasinoColumnKey) => {
      if (!hideableCasinoColumnKeys.has(columnKey)) {
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
      columnKey: CasinoColumnKey,
      headerCell: HTMLTableCellElement | null
    ) => {
      event.preventDefault();
      event.stopPropagation();
      const startingWidth =
        headerCell?.getBoundingClientRect().width ??
        columnWidths[columnKey] ??
        defaultCasinoColumnWidths[columnKey];
      const startX = event.clientX;
      const handlePointerMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const nextWidth = Math.max(96, Math.round(startingWidth + delta));
        setColumnWidths((current) => ({ ...current, [columnKey]: nextWidth }));
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
      columnKey: CasinoColumnKey,
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
        candidates.push(Math.max(cell.scrollWidth + 28, childWidth + 28));
      });
      const nextWidth = Math.max(96, Math.min(420, Math.ceil(Math.max(...candidates))));
      setColumnWidths((current) => ({ ...current, [columnKey]: nextWidth }));
    },
    [tableColumns]
  );

  const updateTableFilter = useCallback(
    <TKey extends keyof CasinoTableFilterState>(key: TKey, value: CasinoTableFilterState[TKey]) => {
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

  const toggleTableSort = useCallback((key: CasinoSortKey) => {
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

      if (tableSort.key === "date_settling") {
        const leftValue = getComparableDate(left.date_settling) ?? Number.POSITIVE_INFINITY;
        const rightValue = getComparableDate(right.date_settling) ?? Number.POSITIVE_INFINITY;
        return (leftValue - rightValue) * direction;
      }

      if (tableSort.key === "displayed_value") {
        const leftValue = Number(left.resolved_net_pnl ?? left.final_net_pnl ?? left.calc_net_pnl ?? 0);
        const rightValue = Number(right.resolved_net_pnl ?? right.final_net_pnl ?? right.calc_net_pnl ?? 0);
        return (leftValue - rightValue) * direction;
      }

      const leftValue = String(left[tableSort.key] ?? "").toLowerCase();
      const rightValue = String(right[tableSort.key] ?? "").toLowerCase();
      return leftValue.localeCompare(rightValue, "en-GB") * direction;
    });

    return nextRows;
  }, [reviewRows, tableSort]);

  const casinoRowsById = useMemo(
    () => new Map(rows.map((row) => [row.casino_offer_id, row])),
    [rows]
  );

  const casinoFilterOptions = useMemo(
    () => ({
      bookmakers: dedupeOptions(rows.map((row) => row.bookmaker)),
      offerTypes: dedupeOptions(rows.map((row) => row.offer_type)),
      statuses: dedupeOptions(rows.map((row) => row.status)),
      results: dedupeOptions(rows.map((row) => row.result)),
    }),
    [rows]
  );

  const filteredSourceRows = useMemo(() => {
    return sortedReviewRows.filter((row) => {
      if (
        !initialIssueFilter &&
        !feeReviewContext &&
        !isDateWithinResolvedRange(getCasinoRangeAnchor(row), resolvedDateRange)
      ) {
        return false;
      }
      if (feeReviewContext && !feeReviewContext.recordIds.includes(row.casino_offer_id)) {
        return false;
      }
      if (tableFilters.bookmaker && row.bookmaker !== tableFilters.bookmaker) {
        return false;
      }
      if (tableFilters.offer_type && row.offer_type !== tableFilters.offer_type) {
        return false;
      }
      if (tableFilters.status && row.status !== tableFilters.status) {
        return false;
      }
      if (tableFilters.result && row.result !== tableFilters.result) {
        return false;
      }
      if (!getCasinoIssueFilterMatch(row, tableFilters.issue_type)) {
        return false;
      }

      const rowValue = Number(row.resolved_net_pnl ?? row.final_net_pnl ?? row.calc_net_pnl ?? 0);
      const minValue = parseCasinoCurrencyLikeValue(tableFilters.min_value);
      const maxValue = parseCasinoCurrencyLikeValue(tableFilters.max_value);
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
      casino_offer_id: row.casino_offer_id,
      date_settling: formatDisplayDate(row.date_settling),
      expiry_datetime: formatDisplayDate(row.expiry_datetime),
      bookmaker: row.bookmaker,
      offer_type: row.offer_type,
      offer_name: row.offer_name,
      game: row.game,
      status: row.status,
      result: row.result,
      displayed_value: getDisplayedCasinoValueForRow(row),
      displayed_value_label: getDisplayedCasinoValueLabelForRow(row),
      actions: "Actions",
    }));
    return filterTrackerRows(tableRows, casinoTableColumns, query);
  }, [filteredSourceRows, query]);

  const pageCount = getTrackerPageCount(filteredRows.length, pageSize);
  const effectivePage = Math.min(currentPage, pageCount);
  const pagedRows = useMemo(
    () => paginateTrackerRows(filteredRows, effectivePage, pageSize),
    [effectivePage, filteredRows]
  );
  const editorHeaderFullTitle = useMemo(() => {
    const offerName = formState.offer_name.trim();
    if (offerName) {
      return offerName;
    }

    const offerType = formState.offer_type.trim();
    if (offerType) {
      return offerType;
    }

    const gameName = formState.game.trim();
    if (gameName) {
      return gameName;
    }

    return "New casino row";
  }, [formState.game, formState.offer_name, formState.offer_type]);
  const editorHeaderTitle = useMemo(
    () => truncateHeaderTitle(editorHeaderFullTitle, 75),
    [editorHeaderFullTitle]
  );

  async function selectRow(rowId: string, options?: { collapseTable?: boolean }) {
    if (rowId !== selectedId && isDirty && !(await confirmDiscardChanges())) {
      return;
    }
    const record = rows.find((entry) => entry.casino_offer_id === rowId);
    if (!record) {
      return;
    }
    setSelectedId(rowId);
    setActiveEditorTabId("setup");
    setSelectedComboId("");
    isCreatingDraftRef.current = false;
    setWorkflowVisible(true);
    const nextFormState = recordToForm(record);
    setFormState(nextFormState);
    setPristineFormState(nextFormState);
    setErrorMessage("");
    setShowOfferIdentityValidation(false);
    setSettledEditEnabled(false);
    setActiveMoneyKeypadField(null);
    setMoneyKeypadPrimedField(null);
    setStatusMessage("");
    setTableCollapsed(Boolean(options?.collapseTable));
    revealEditor({ expandLedger: !options?.collapseTable });
  }

  async function startNewRow() {
    if (isDirty && !(await confirmDiscardChanges())) {
      return;
    }
    setSelectedId(null);
    selectedIdRef.current = null;
    setActiveEditorTabId("setup");
    setSelectedComboId("");
    isCreatingDraftRef.current = true;
    setWorkflowVisible(true);
    setTableCollapsed(false);
    const blankForm = createBlankForm();
    setFormState(blankForm);
    setPristineFormState(blankForm);
    setErrorMessage("");
    setShowOfferIdentityValidation(false);
    setSettledEditEnabled(false);
    setActiveMoneyKeypadField(null);
    setMoneyKeypadPrimedField(null);
    setStatusMessage("");
    revealEditor({ expandLedger: true });
  }

  function buildFreeSpinsQuickAddForm(values: CasinoFreeSpinsQuickAddValues): CasinoOfferFormState {
    const operatingDate = getCurrentDateTimeLocalValue();
    const base = applyCasinoOfferTypeDefaults(createBlankForm(), "Free Spins");
    const convertedWin = formatCasinoMoneyInput(values.convertedWin);
    return {
      ...base,
      date_started: operatingDate,
      date_settling: operatingDate,
      bookmaker: values.bookmaker,
      offer_name: values.offerName.trim() || "Free Spins",
      game: values.game.trim(),
      spin_stake: formatCasinoMoneyInput(values.spinStake),
      free_spins_awarded: values.spinCount,
      free_spins_value: convertedWin,
      own_cash_committed: "0.00",
      status: "Settled",
      result: Number(convertedWin) > 0 ? "Win" : "Lose",
      final_net_pnl: convertedWin,
    };
  }

  async function saveFreeSpinsQuickAdd(values: CasinoFreeSpinsQuickAddValues): Promise<boolean> {
    const nextForm = buildFreeSpinsQuickAddForm(values);
    const saved = await persistForm(nextForm, { returnToLedgerOnSuccess: true });
    if (saved) {
      setQuickAddReturnValues(null);
      setIsQuickAddOpen(false);
    }
    return saved;
  }

  function openFreeSpinsQuickAddDetails(values: CasinoFreeSpinsQuickAddValues) {
    const nextForm = buildFreeSpinsQuickAddForm(values);
    setQuickAddReturnValues(values);
    setIsQuickAddOpen(false);
    setSelectedId(null);
    selectedIdRef.current = null;
    isCreatingDraftRef.current = true;
    setFormState(nextForm);
    setPristineFormState(nextForm);
    setActiveEditorTabId("setup");
    setWorkflowVisible(true);
    setTableCollapsed(false);
    setErrorMessage("");
    revealEditor({ expandLedger: true });
  }

  function returnToFreeSpinsQuickAdd() {
    setQuickAddReturnValues({
      bookmaker: formState.bookmaker,
      offerName: formState.offer_name,
      game: formState.game,
      spinCount: formState.free_spins_awarded,
      spinStake: formState.spin_stake,
      convertedWin: formState.free_spins_value,
    });
    setWorkflowVisible(false);
    setSelectedId(null);
    selectedIdRef.current = null;
    isCreatingDraftRef.current = false;
    setTableCollapsed(false);
    setIsQuickAddOpen(true);
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
    ignoreInitialRecordIdRef.current = true;
    isCreatingDraftRef.current = false;
    setTableCollapsed(false);
    setActiveMoneyKeypadField(null);
    setMoneyKeypadPrimedField(null);
    setStatusMessage("");
  }

  function buildPersistForm(nextFormState: CasinoOfferFormState): CasinoOfferFormState {
    const capabilities = getCasinoOfferCapabilities(nextFormState.offer_type);
    const rewardTarget = getDerivedRewardWagerTarget(nextFormState);
    const requiredSpins = getDerivedRequiredSpins(nextFormState);
    const rewardRequiredSpins =
      capabilities.hasRewardWagering && rewardTarget
        ? calculateSpinsRequired({
            wagerTarget: rewardTarget,
            spinStake: nextFormState.spin_stake,
          }).actionableSpins
        : null;
    return {
      ...nextFormState,
      date_settling: nextFormState.date_started,
      wagering_base: casinoOfferTypeUsesFieldGroup(nextFormState.offer_type, "wagering")
        ? getStoredCasinoWagerBase(nextFormState)
        : nextFormState.wagering_base,
      required_spins: requiredSpins || nextFormState.required_spins,
      reward_type: getStoredCasinoRewardType(nextFormState),
      reward_wager_multiplier: capabilities.hasRewardWagering
        ? nextFormState.wager_multiplier
        : nextFormState.reward_wager_multiplier,
      reward_wager_target: rewardTarget || nextFormState.reward_wager_target,
      reward_required_spins:
        rewardRequiredSpins === null ? nextFormState.reward_required_spins : String(rewardRequiredSpins),
      expected_reward_cash_value: casinoOfferTypeUsesFieldGroup(nextFormState.offer_type, "rewardValue")
        ? nextFormState.free_spins_value
        : nextFormState.expected_reward_cash_value,
    };
  }

  function canPersistForm(nextFormState: CasinoOfferFormState): boolean {
    return (
      getMissingRequiredFields(nextFormState).length === 0 &&
      getMissingCampaignFields(nextFormState).length === 0 &&
      getMissingRewardFields(nextFormState).length === 0 &&
      getMissingCasinoSettlementFields(nextFormState).length === 0
    );
  }

  async function persistForm(
    nextFormState: CasinoOfferFormState,
    options?: {
      autosaveLabel?: string;
      suppressMissingRequiredMessage?: boolean;
      returnToLedgerOnSuccess?: boolean;
      skipWorkflowValidation?: boolean;
    }
  ): Promise<boolean> {
    if (isPersistingRef.current) {
      return false;
    }

    setErrorMessage("");
    const resolvedFormState = buildPersistForm(nextFormState);
    if (!options?.skipWorkflowValidation && !canPersistForm(resolvedFormState)) {
      setShowOfferIdentityValidation(true);
      if (!options?.suppressMissingRequiredMessage) {
        const missingFields = [
          ...getMissingRequiredFields(resolvedFormState),
          ...getMissingCampaignFields(resolvedFormState),
          ...getMissingRewardFields(resolvedFormState),
          ...getMissingCasinoSettlementFields(resolvedFormState),
        ];
        setStatusMessage(`Complete required casino-offer fields before saving: ${missingFields.join(", ")}.`);
      }
      return false;
    }

    isPersistingRef.current = true;
    setIsPersisting(true);

    try {
      const activeRowId = resolvedFormState.casino_offer_id ?? selectedId;
      const isEditing = Boolean(activeRowId);
      const url = isEditing
        ? `${apiBaseUrl}/profiles/${profileId}/casino-offers/${activeRowId}`
        : `${apiBaseUrl}/profiles/${profileId}/casino-offers`;
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...resolvedFormState,
          date_started: fromDateTimeLocalValue(resolvedFormState.date_started),
          date_settling: fromDateTimeLocalValue(resolvedFormState.date_settling),
          expiry_datetime: fromDateTimeLocalValue(resolvedFormState.expiry_datetime),
        }),
      });

      if (!response.ok) {
        setErrorMessage(await response.text());
        return false;
      }

      const saved = (await response.json()) as CasinoOfferRecord;
      invalidateCachedJson(`${apiBaseUrl}/profiles/${profileId}/casino-offers`);
      dispatchTrackerDataUpdated({ ledger: "casino-offers", profileId });
      const returnToLedger = options?.returnToLedgerOnSuccess ?? !options?.autosaveLabel;
      const savedFormState = recordToForm(saved);
      if (returnToLedger) {
        ignoreInitialRecordIdRef.current = true;
      }
      await loadRows(returnToLedger ? null : saved.casino_offer_id);
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
        setStatusMessage("");
      } else {
        setFormState(savedFormState);
        setPristineFormState(savedFormState);
        setStatusMessage(
          options?.autosaveLabel && !workflowVisible
            ? `${options.autosaveLabel} autosaved for ${saved.casino_offer_id}.`
            : ""
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
    updater: (current: CasinoOfferFormState) => CasinoOfferFormState,
    autosaveLabel: string
  ) {
    const nextFormState = buildPersistForm(updater(formState));
    setFormState(nextFormState);
    if (!(selectedId ?? formState.casino_offer_id)) {
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

  async function submitOutcomeModal() {
    if (!outcomeModalState) {
      return;
    }

    const sourceRow = rows.find((row) => row.casino_offer_id === outcomeModalState.rowId);
    if (!sourceRow) {
      setStatusMessage("Casino row could not be found for outcome update.");
      return;
    }

    if (
      getSettlementValidationMessage(
        outcomeModalState.status,
        outcomeModalState.result,
        outcomeModalState.date_settling
      ) ||
      (outcomeModalState.status === "Settled" &&
        !sourceRow.calc_net_pnl &&
        !outcomeModalState.final_net_pnl.trim())
    ) return;

    const nextFormState: CasinoOfferFormState = {
      ...recordToForm(sourceRow),
      status: outcomeModalState.status,
      result: outcomeModalState.result,
      date_settling: outcomeModalState.date_settling,
      final_net_pnl: outcomeModalState.final_net_pnl,
    };

    const saved = await persistForm(nextFormState, {
      autosaveLabel: "Outcome update",
      suppressMissingRequiredMessage: true,
      returnToLedgerOnSuccess: true,
      skipWorkflowValidation: true,
    });
    if (saved) {
      setOutcomeModalState(null);
      if (feeReviewContext) await refreshFeeReviewResolutionSession(apiBaseUrl, feeReviewContext);
    }
  }

  function handleResetForm() {
    if (isPersistingRef.current) {
      return;
    }
    if (selectedRow) {
      const nextFormState = recordToForm(selectedRow);
      setActiveEditorTabId("setup");
      setFormState(nextFormState);
      setPristineFormState(nextFormState);
      setErrorMessage("");
      setShowOfferIdentityValidation(false);
      setSettledEditEnabled(false);
      setSettledDeleteGuardRowId(null);
      setSettledDeleteReason("");
      setActiveMoneyKeypadField(null);
      setMoneyKeypadPrimedField(null);
      setStatusMessage(`Reverted unsaved changes for casino offer ${selectedRow.casino_offer_id}.`);
      return;
    }

    const blankForm = createBlankForm();
    setActiveEditorTabId("setup");
    setSelectedComboId("");
    setFormState(blankForm);
    setPristineFormState(blankForm);
    setErrorMessage("");
    setShowOfferIdentityValidation(false);
    setSettledEditEnabled(false);
    setSettledDeleteGuardRowId(null);
    setSettledDeleteReason("");
    setActiveMoneyKeypadField(null);
    setMoneyKeypadPrimedField(null);
    setStatusMessage("Cleared the unsaved casino-offer draft.");
  }

  function handleCancelSettledEdit() {
    setFormState(pristineFormState);
    setErrorMessage("");
    setShowOfferIdentityValidation(false);
    setSettledEditEnabled(false);
    setSettledDeleteGuardRowId(null);
    setSettledDeleteReason("");
    setActiveMoneyKeypadField(null);
    setMoneyKeypadPrimedField(null);
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
      selectedRow?.casino_offer_id === rowId
        ? selectedRow
        : rows.find((row) => row.casino_offer_id === rowId);
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
        message: `Delete casino row ${rowId}? This will remove it from this profile tracker.`,
        title: "Delete casino row?",
      });
      if (!confirmed) {
        return;
      }
    }

    setErrorMessage("");
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/casino-offers/${rowId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setErrorMessage((await response.text()) || "Unable to delete casino-offer row");
      return;
    }

    invalidateCachedJson(`${apiBaseUrl}/profiles/${profileId}/casino-offers`);
    dispatchTrackerDataUpdated({ ledger: "casino-offers", profileId });
    await loadRows(null);
    if (selectedId === rowId) setWorkflowVisible(false);
    setStatusMessage(`Deleted casino offer ${rowId}.`);
    if (feeReviewContext) await refreshFeeReviewResolutionSession(apiBaseUrl, feeReviewContext);
  }

  function renderTableCell(row: TrackerRow, column: TableColumn) {
    const rowId = String(row.casino_offer_id ?? "");
    const sourceRow = casinoRowsById.get(rowId);
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

    if (column.key === "result") {
      return (
        <span className="table-chip">
          {getCasinoResultLabel(String(row.offer_type ?? ""), value)}
        </span>
      );
    }

    if (column.key === "offer_type" || column.key === "status") {
      if (column.key === "status" && sourceRow) {
        const normalizedStatus = value.toLowerCase();
        const statusToneClass =
          normalizedStatus.includes("prospecting")
            ? " table-chip-muted"
            : normalizedStatus.includes("settled")
              ? " table-chip-status-settled"
              : normalizedStatus.includes("placed") || normalizedStatus.includes("active")
                ? " table-chip-status-placed"
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
            aria-label={`Edit ${sourceRow.casino_offer_id}`}
            className="icon-button table-action-button"
            onClick={() => void selectRow(sourceRow.casino_offer_id)}
            type="button"
          >
            <span aria-hidden="true">✎</span>
          </button>
          <button
            aria-label={`Review settlement for ${sourceRow.casino_offer_id}`}
            className="icon-button table-action-button"
            onClick={() =>
              setOutcomeModalState({
                rowId: sourceRow.casino_offer_id,
                status: sourceRow.status,
                result: sourceRow.result,
                date_settling: toDateTimeLocalValue(sourceRow.date_settling),
                final_net_pnl: sourceRow.final_net_pnl,
              })
            }
            type="button"
          >
            <span aria-hidden="true">🏁</span>
          </button>
          <button
            aria-label={`Delete casino-offer row ${sourceRow.casino_offer_id}`}
            className="icon-button icon-button-destructive table-action-button"
            onClick={() => void handleDeleteSelectedRow(sourceRow.casino_offer_id)}
            title={`Delete ${sourceRow.casino_offer_id}`}
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined">delete</span>
          </button>
        </div>
      );
    }

    if (column.key === "displayed_value") {
      const label = String(row.displayed_value_label ?? "Value");
      const numericValue = parseCasinoCurrencyLikeValue(value);
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
          <h1 className="sportsbook-page-title">Casino Offers</h1>
        </div>
        {isInitialLoading ? (
          <LedgerLoadingIndicator label="Loading casino-offer ledger" />
        ) : null}
        <section className="stat-strip" aria-label="Casino quick view">
          <TrackerRangeCard
            activePreset={trackerSettings?.active_date_preset ?? "Week (Mon-Sun)"}
            isActionView={Boolean(initialIssueFilter)}
            isSaving={isTrackerRangeSaving}
            onPresetChange={(preset) => void updateTrackerDatePreset(preset)}
            rangeDetail={quickViewRangeDetail}
            rangeContext={quickViewRangeContext}
          />
          <article className="stat-card">
            <span className="eyebrow">Open / prospecting</span>
            <strong>
              {quickView.openCount} / {quickView.prospectingCount}
            </strong>
            <span>Active rows • Prospecting rows</span>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Settling / overdue</span>
            <strong>
              {quickView.settlingCount} / {quickView.overdueCount}
            </strong>
            <span>Rows with settle dates • Overdue rows</span>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Reward-led / wagering</span>
            <strong>
              {quickView.rewardLedCount} / {quickView.wageringCount}
            </strong>
            <span>Reward-led rows • Wagering rows</span>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Resolved value</span>
            <strong><FinancialValue value={quickView.totalResolvedValue} /></strong>
            <span>Current ledger total</span>
          </article>
        </section>
        <div className="sportsbook-review-bar" aria-label="Casino-offer ledger controls" role="toolbar">
          <label className="field-control table-search-field"><span className="visually-hidden">Search casino-offer rows</span><input aria-label="Search casino-offer rows" onChange={(event) => { setQuery(event.target.value); setCurrentPage(1); }} placeholder="Search casino-offer rows" type="search" value={query} /></label>
          <button
            aria-label="Quick add Free Spins"
            className="icon-button ledger-toolbar-quick-add-action"
            data-pd-id="casino-quick-add.open"
            onClick={() => {
              setErrorMessage("");
              setQuickAddReturnValues(null);
              setIsQuickAddOpen(true);
            }}
            title="Quick add Free Spins"
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined">bolt</span>
            <span>Quick Add</span>
          </button>
          <LedgerAddRowButton label="Add casino row" onClick={() => void startNewRow()} />
          <div className="table-filter-button-wrap">
            <button aria-label="Open casino-offer filter and column controls" className={`icon-button table-filter-button${hasActiveTableControls ? " has-active-table-controls" : ""}`} onClick={() => setIsFilterModalOpen(true)} title="Filter and columns" type="button"><svg aria-hidden="true" className="table-filter-icon" fill="none" viewBox="0 0 24 24"><path d="M4 6h16l-6.5 7.3v4.9l-3 1.8v-6.7L4 6Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>{hasActiveTableControls ? <span aria-label={`${activeTableControlCount} active table controls`} className="table-filter-badge">{activeTableControlCount > 9 ? "9+" : activeTableControlCount}</span> : null}</button>
            {hasActiveTableControls ? <button aria-label="Clear active casino-offer filters and hidden-column states" className="table-filter-clear" onClick={() => { clearTableFilters(); setVisibleColumnKeys(new Set(defaultVisibleCasinoColumns)); }} type="button">×</button> : null}
          </div>
        </div>
        {!tableCollapsed ? (
          <>
            {errorMessage ? (
              <p className="error-text" role="alert">
                {errorMessage}
              </p>
            ) : null}
            <div className="table-scroll">
              <table className="data-table sportsbook-data-table">
                <colgroup>
                  {tableColumns.map((column) => {
                    const key = column.key as CasinoColumnKey;
                    const width = columnWidths[key] ?? defaultCasinoColumnWidths[key];
                    return <col key={column.key} style={{ width: `${width}px` }} />;
                  })}
                </colgroup>
                <thead>
                  <tr>
                    {tableColumns.map((column) => {
                      const sortable = isSortableCasinoColumn(column.key);
                      const sortableKey = sortable ? (column.key as CasinoSortKey) : null;
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
                                  column.key as CasinoColumnKey,
                                  headerCell,
                                  tableElement
                                );
                              }}
                              onMouseDown={(event) => {
                                const headerCell = event.currentTarget.closest("th");
                                startColumnResize(
                                  event,
                                  column.key as CasinoColumnKey,
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
                        No casino-offer rows match the current filter.
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((row, index) => {
                      const rowId = String(row.casino_offer_id);
                      const sourceRow = casinoRowsById.get(rowId);
                      const issueTone = sourceRow ? getCasinoIssueTone(sourceRow) : null;
                      const rowIssueBadges = sourceRow
                        ? sortIssueBadgesByPriority(getCasinoOperationalIssueBadges(sourceRow))
                        : [];
                      return (
                        <tr
                          className={[
                            selectedId === rowId ? "is-selected-row" : "",
                            issueTone === "danger"
                              ? "row-state-issue-danger"
                              : issueTone === "warning"
                                ? "row-state-issue-warning"
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
                              {column.key === "date_settling" && rowIssueBadges.length > 0 ? (
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
            <div className="table-pagination" aria-label="Casino-offer pagination">
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
            aria-label="Casino-offer filter controls"
            aria-modal="true"
            className="modal-panel stack"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="workflow-panel-header">
              <div className="stack">
                <span className="eyebrow">Table controls</span>
                <strong>Filter casino-offer rows</strong>
              </div>
              <button
                aria-label="Close casino-offer filter controls"
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
                  aria-label="Casino-offer review mode"
                  onChange={(event) => {
                    setTableMode(event.target.value as CasinoOfferTableMode);
                    setCurrentPage(1);
                  }}
                  value={tableMode}
                >
                  {casinoOfferTableModes.map((mode) => (
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
                  {casinoFilterOptions.bookmakers.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Offer type</span>
                <select
                  onChange={(event) => updateTableFilter("offer_type", event.target.value)}
                  value={tableFilters.offer_type}
                >
                  <option value="">All</option>
                  {casinoFilterOptions.offerTypes.map((option) => (
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
                  {casinoFilterOptions.statuses.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Result</span>
                <select
                  onChange={(event) => updateTableFilter("result", event.target.value)}
                  value={tableFilters.result}
                >
                  <option value="">All</option>
                  {casinoFilterOptions.results.map((option) => (
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
                    updateTableFilter("issue_type", event.target.value as CasinoIssueFilter)
                  }
                  value={tableFilters.issue_type}
                >
                  <option value="any">All rows</option>
                  <option value="all-issues">All issues</option>
                  <option value="offer-unplaced">Offer Unplaced</option>
                  <option value="no-settle-date">No Settle Date</option>
                  <option value="outcome-needed">Outcome Needed</option>
                  <option value="final-value-needed">Final Value Needed</option>
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
                {casinoTableColumns.map((column) => {
                  const key = column.key as CasinoColumnKey;
                  const hideable = hideableCasinoColumnKeys.has(key);
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
                  setVisibleColumnKeys(new Set(defaultVisibleCasinoColumns));
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
            aria-label="Update casino outcome"
            aria-modal="true"
            className="modal-panel stack"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="workflow-panel-header">
              <div className="stack">
                <span className="eyebrow">Outcome action</span>
                <strong>Update casino settlement and outcome</strong>
              </div>
              <button
                aria-label="Close casino outcome modal"
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
                      current ? applyCasinoOutcomeModalStatusDefaults(current, event.target.value) : current
                    )
                  }
                  value={outcomeModalState.status}
                >
                  {casinoOfferStatusOptions.map((option) => (
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
                      current ? applyCasinoOutcomeModalResultDefaults(current, event.target.value) : current
                    )
                  }
                  value={outcomeModalState.result}
                >
                  {(rows.find((row) => row.casino_offer_id === outcomeModalState.rowId)
                    ? getCasinoResultOptions(
                        rows.find((row) => row.casino_offer_id === outcomeModalState.rowId)?.offer_type ?? ""
                      )
                    : getCasinoResultOptions("")
                  ).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control field-span-2">
                <span>Settles</span>
                <input
                  onChange={(event) =>
                    setOutcomeModalState((current) =>
                      current ? { ...current, date_settling: event.target.value } : current
                    )
                  }
                  type="datetime-local"
                  value={outcomeModalState.date_settling}
                />
              </label>
              <label className="field-control field-span-2">
                <span>Net Result (Profit/Loss)</span>
                <input
                  aria-describedby="casino-outcome-net-result-help"
                  inputMode="decimal"
                  onBlur={normalizeOutcomeMoneyField}
                  onChange={(event) =>
                    setOutcomeModalState((current) =>
                      current ? { ...current, final_net_pnl: event.target.value } : current
                    )
                  }
                  placeholder="0.00"
                  value={outcomeModalState.final_net_pnl}
                />
                <small id="casino-outcome-net-result-help">
                  Enter 0 for break-even or a negative amount for a loss.
                </small>
              </label>
            </div>
            <div className="tracker-nav">
              <button className="button-link" onClick={() => setOutcomeModalState(null)} type="button">
                Close
              </button>
              <button
                aria-describedby="casino-outcome-validation"
                className="modal-primary-button"
                disabled={Boolean(
                  getSettlementValidationMessage(outcomeModalState.status, outcomeModalState.result, outcomeModalState.date_settling) ||
                  (outcomeModalState.status === "Settled" &&
                  !rows.find((row) => row.casino_offer_id === outcomeModalState.rowId)?.calc_net_pnl &&
                  !outcomeModalState.final_net_pnl.trim()
                    ? "Add the final value before saving this settled casino row."
                    : "")
                )}
                onClick={() => void submitOutcomeModal()}
                type="button"
              >
                Save
              </button>
            </div>
            <span className="field-help field-span-2" id="casino-outcome-validation" role="status">
              {getSettlementValidationMessage(outcomeModalState.status, outcomeModalState.result, outcomeModalState.date_settling) ||
                (outcomeModalState.status === "Settled" &&
                !rows.find((row) => row.casino_offer_id === outcomeModalState.rowId)?.calc_net_pnl &&
                !outcomeModalState.final_net_pnl.trim()
                  ? "Add the final value before saving this settled casino row."
                  : "")}
            </span>
          </section>
        </div>
      ) : null}

      {workflowVisible ? (
        <div className="modal-backdrop" onClick={() => void closeEditor()}>
      <section
        aria-label={selectedId ? "Edit casino row" : "Create casino row"}
        aria-busy={isPersisting}
        aria-modal="true"
        className="content-panel stack workflow-editor-panel modal-panel workflow-editor-modal casino-tabbed-editor-modal"
        data-pd-id="casino-offers.editor.dialog"
        onClick={(event) => event.stopPropagation()}
        ref={editorRef}
        role="dialog"
      >
        <div className="workflow-panel-header workflow-editor-header" data-pd-id="casino-offers.editor.header">
          <div className="stack workflow-editor-title-stack">
            <span className="eyebrow">{selectedId ? "Edit casino row" : "Create casino row"}</span>
            <strong className="workflow-header-title" title={editorHeaderFullTitle}>{editorHeaderTitle}</strong>
          </div>
          <section
            aria-label="Casino editor context"
            className="editor-compact-summary"
            data-pd-id="casino-offers.editor.compact-summary"
          >
            <span
              className="table-chip editor-summary-value-chip"
              title={`${displayedValueLabel}: ${displayedValue}`}
            >
              {displayedNumericValue === null ? (
                <span className="ledger-financial-value ledger-financial-value-unavailable">
                  £ -
                </span>
              ) : (
                <FinancialValue
                  animate={false}
                  className="ledger-financial-value editor-summary-financial-value"
                  label={displayedValueLabel}
                  value={displayedNumericValue}
                  zeroTone="neutral"
                />
              )}
            </span>
            <span className={getCasinoSummaryStatusChipClass(formState.status || "Prospecting")}>
              {formState.status || "Prospecting"}
            </span>
            <span className={getCasinoSummaryResultChipClass(formState.result || "Pending")}>
              {formState.result || "Pending"}
            </span>
            <span className="table-chip table-chip-offer">
              {formState.offer_type
                ? getCasinoOfferTypeDisplayLabel(formState.offer_type)
                : "Offer type pending"}
            </span>
            <span className="table-chip table-chip-muted">{formState.game || "Game unknown"}</span>
          </section>
          <div className="tracker-nav workflow-editor-header-actions">
            <div
              aria-label="Casino editor tab navigation"
              className="workflow-editor-header-nav"
              data-pd-id="casino-offers.editor.tab-actions"
              role="group"
            >
              <button
                className="review-chip review-chip-action-previous"
                disabled={!previousCasinoEditorTab}
                onClick={() => {
                  if (previousCasinoEditorTab) {
                    activateCasinoEditorTab(previousCasinoEditorTab.id as CasinoEditorTabId);
                  }
                }}
                type="button"
              >
                Previous
              </button>
              <button
                className="review-chip review-chip-action-next"
                disabled={!nextCasinoEditorTab}
                onClick={() => {
                  if (nextCasinoEditorTab) {
                    activateCasinoEditorTab(nextCasinoEditorTab.id as CasinoEditorTabId);
                  }
                }}
                type="button"
              >
                Next
              </button>
            </div>
            <button
              aria-label="Close casino editor"
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
            ariaLabel="Casino editor sections"
            guidedTargetTabId={guidedEntryVisible ? guidedEntryTargetTabId : null}
            onActiveTabChange={(tabId) => activateCasinoEditorTab(tabId as CasinoEditorTabId)}
            tabs={casinoEditorTabs}
          />
        </div>
        {guidedEntryVisible ? (
          <section
            aria-label="Casino guided entry"
            className={`guided-entry-banner guided-entry-banner-${safeGuidedEntry.state}`}
            data-pd-id="casino-offers.guided-entry"
            key={`${safeGuidedEntry.state}:${safeGuidedEntry.nextRequiredField ?? "none"}:${guidedEntryActionMessage}`}
            role="status"
          >
            <button className="guided-entry-action" onClick={focusGuidedEntryTarget} type="button">
              <span className="eyebrow">
                {safeGuidedEntry.state === "review_required" ? "Review required" : "Next required"}
              </span>
              <strong id={guidedEntryMessageId}>{renderGuidedEntryInstruction()}</strong>
            </button>
            <button
              aria-label="Dismiss casino guided entry"
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
            data-pd-id="casino-offers.guided-entry.restore"
            onClick={() => setGuidedEntryDismissed(false)}
            type="button"
          >
            Show guide
          </button>
        ) : null}
        <div className="workflow-editor-body">
        {initialRecordId === selectedId && !hasResolvedCasinoValue ? (
          <EditorValidationBanner
            dismissKey={`casino-fee-review-final-value:${selectedId ?? "unknown"}`}
            id="casino-offer.editor.fee-review-final-value"
            message="Select Edit, then enter the confirmed Net Result in Settlement."
            title="Final value required"
          />
        ) : null}
        <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
          <LedgerEditorTabPanel activeTabId={safeActiveEditorTabId} tabId="setup">
          <EditorSection
            collapsible={false}
            headerAside={
              renderEditorSectionAside("setup")
            }
            invalid={offerIdentityValidationActive && missingOfferIdentityFields.length > 0}
            title="Offer setup"
          >
            {!selectedId && !formState.casino_offer_id ? (
              <div className="stack-tight common-bet-combo-apply" data-pd-id="casino-offers.common-combo">
                <label className="field-control">
                  <span>Common Combo</span>
                  <select
                    aria-label="Apply casino common combo"
                    data-pd-id="casino-offers.common-combo.select"
                    onChange={(event) => applyCommonBetCombo(event.target.value)}
                    value={selectedComboId}
                  >
                    <option value="">No combo</option>
                    {commonBetCombos.map((combo) => (
                      <option key={combo.preset_id} value={combo.preset_id}>{combo.name}</option>
                    ))}
                  </select>
                </label>
                {selectedComboCoverage.length > 1 ? (
                  <div aria-label="Eligible casino bookmakers" className="common-combo-candidate-row">
                    {selectedComboCoverage.map((coverage) => (
                      <button
                        aria-label={`${coverage.bookmaker}: ${coverage.reason}`}
                        className={`common-combo-candidate is-${coverage.state === "not_signed_up" ? "missing" : coverage.state}${formState.bookmaker === coverage.bookmaker ? " is-selected" : ""}`}
                        disabled={!coverage.selectable}
                        key={coverage.bookmaker}
                        onClick={() => setFormState((current) => ({ ...current, bookmaker: coverage.bookmaker }))}
                        title={coverage.reason}
                        type="button"
                      >
                        <span>{coverage.bookmaker}</span>
                        <small>{coverage.reason}</small>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {offerIdentityValidationActive && missingOfferIdentityFields.length > 0 ? (
              <EditorValidationBanner
                dismissKey={`casino-offer-identity:${selectedId ?? formState.casino_offer_id ?? "new"}:${missingOfferIdentityFields.join("|")}`}
                id="casino-offer.editor.identity-validation"
                message={`Complete these fields before saving: ${missingOfferIdentityFields.join(", ")}.`}
                title="Offer identity incomplete"
              />
            ) : null}
            <fieldset className="section-fieldset" disabled={isSettledReadOnly}>
            <div className="form-grid">
              <label
                className={`${getGuidedFieldClass("offer_name")}${
                  offerIdentityValidationActive && !formState.offer_name.trim() ? " is-invalid" : ""
                } field-span-2`}
                {...getGuidedFieldData("offer_name")}
              >
                <span>Offer name</span>
                <input
                  aria-describedby={getGuidedDescribedBy("offer_name")}
                  aria-invalid={offerIdentityValidationActive && !formState.offer_name.trim()}
                  onChange={(event) =>
                    void applyDropdownChange(
                      (current) => ({ ...current, offer_name: event.target.value }),
                      "Offer name change"
                    )
                  }
                  placeholder="Enter the casino offer name"
                  required
                  value={formState.offer_name}
                />
              </label>
              <label
                className={`${getGuidedFieldClass("date_started")}${
                  offerIdentityValidationActive && !formState.date_started.trim() ? " is-invalid" : ""
                }`}
                {...getGuidedFieldData("date_started")}
              >
                <span>Date started</span>
                <div className="inline-field-action">
                  <input
                    aria-describedby={getGuidedDescribedBy("date_started")}
                    aria-invalid={offerIdentityValidationActive && !formState.date_started.trim()}
                    type="datetime-local"
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        date_started: event.target.value,
                        date_settling: event.target.value,
                      }))
                    }
                    required
                    value={formState.date_started}
                  />
                  <button
                    aria-label="Set casino start date to now"
                    className="date-offset-pill"
                    onClick={() => {
                      const nowValue = getCurrentDateTimeLocalValue();
                      setFormState((current) => ({
                        ...current,
                        date_started: nowValue,
                        date_settling: nowValue,
                      }));
                    }}
                    type="button"
                  >
                    Now
                  </button>
                </div>
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
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className={getGuidedFieldClass("offer_type")}
                {...getGuidedFieldData("offer_type")}
              >
                <span>Offer type</span>
                <select
                  aria-describedby={getGuidedDescribedBy("offer_type")}
                  onChange={(event) =>
                    void applyDropdownChange(
                      (current) => applyCasinoOfferTypeDefaults(current, event.target.value),
                      "Offer type change"
                    )
                  }
                  value={formState.offer_type}
                >
                  <option value="">Select offer type</option>
                  {offerTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {getCasinoOfferTypeDisplayLabel(option)}
                    </option>
                  ))}
                </select>
                <small className="field-help-text" data-pd-id="casino-offers.editor.offer-type-help">
                  {formState.offer_type
                    ? getCasinoOfferTypeHelpText(formState.offer_type)
                    : "Choose the casino workflow that matches how the reward is earned."}
                </small>
                <span
                  aria-label="Common casino workflow suggestions"
                  className="casino-field-quick-chip-row"
                  data-pd-id="casino-offers.editor.offer-type-chips"
                >
                  {commonCasinoOfferTypeChips.map((offerType) => (
                    <button
                      className={`review-chip review-chip-action${
                        normalizeCasinoOfferType(formState.offer_type) === offerType ? " is-active" : ""
                      }`}
                      key={offerType}
                      onClick={() =>
                        void applyDropdownChange(
                          (current) => applyCasinoOfferTypeDefaults(current, offerType),
                          "Offer type change"
                        )
                      }
                      type="button"
                    >
                      {getCasinoOfferTypeDisplayLabel(offerType)}
                    </button>
                  ))}
                </span>
              </label>
              <label className="field-control">
                <span>Game / slot</span>
                <input
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, game: event.target.value }))
                  }
                  value={formState.game}
                />
              </label>
              <label className="field-control">
                <span>Expiry</span>
                <input
                  type="datetime-local"
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, expiry_datetime: event.target.value }))
                  }
                  value={formState.expiry_datetime}
                />
              </label>
            </div>
            </fieldset>
          </EditorSection>
          </LedgerEditorTabPanel>
          <LedgerEditorTabPanel activeTabId={safeActiveEditorTabId} tabId="campaign">
          <EditorSection
            collapsible={false}
            headerAside={renderEditorSectionAside(
              "campaign",
              !isSettledReadOnly && !campaignUnlocked ? (
                <span className="section-lock-chip">{getCasinoCampaignLockReason(formState)}</span>
              ) : null
            )}
            invalid={
              offerIdentityValidationActive && campaignUnlocked && missingCampaignFields.length > 0
            }
            title={getCasinoCampaignHeading(formState.offer_type)}
          >
            {offerIdentityValidationActive && campaignUnlocked && missingCampaignFields.length > 0 ? (
              <EditorValidationBanner
                dismissKey={`casino-offer-campaign:${selectedId ?? formState.casino_offer_id ?? "new"}:${missingCampaignFields.join("|")}`}
                id="casino-offer.editor.campaign-validation"
                message={`Complete these campaign fields: ${missingCampaignFields.join(", ")}.`}
                title="Campaign incomplete"
              />
            ) : null}
            <fieldset className="section-fieldset" disabled={isSettledReadOnly || !campaignUnlocked}>
            <div className="form-grid">
          {showsCashStake ? (
            <label
              className={`${getGuidedFieldClass("cash_stake", `casino-money-field ${getCasinoMoneyToneClass(formState.cash_stake)}`)}${
                offerIdentityValidationActive && missingCampaignFields.includes("Cash stake")
                  ? " is-invalid"
                  : ""
              }`}
              {...getGuidedFieldData("cash_stake")}
            >
              <span>{normalizedOfferType === "Wager To Earn Reward" ? "Qualifying cash stake" : "Cash stake"}</span>
              <span className="casino-money-field-input-wrap">
                <span className="casino-money-field-prefix">£</span>
                  <input
                  aria-describedby={getGuidedDescribedBy("cash_stake")}
                  aria-invalid={offerIdentityValidationActive && missingCampaignFields.includes("Cash stake")}
                  inputMode="decimal"
                  onBlur={() => normalizeMoneyField("cash_stake")}
                  onChange={(event) =>
                    setFormState((current) =>
                      applySuggestedOwnCashCommitted(
                        current,
                        applyDerivedWagerTarget({ ...current, cash_stake: event.target.value })
                      )
                    )
                  }
                  value={formState.cash_stake}
                />
                <button
                  aria-label="Open cash stake keypad"
                  className="casino-money-keypad-toggle"
                  onClick={() => toggleMoneyKeypad("cash_stake")}
                  type="button"
                >
                  <span aria-hidden="true" className="material-symbols-outlined">calculate</span>
                </button>
              </span>
              {activeMoneyKeypadField === "cash_stake" ? renderMoneyKeypad("cash_stake") : null}
            </label>
          ) : null}
          {showsCreditAmountField ? (
            <label
              className={`${getGuidedFieldClass("credit_amount", `casino-money-field ${getCasinoMoneyToneClass(formState.credit_amount)}`)}${
                offerIdentityValidationActive &&
                (missingCampaignFields.includes("Cashback amount") ||
                  missingCampaignFields.includes("Refund / credit amount") ||
                  missingCampaignFields.includes("Free-play amount") ||
                  missingCampaignFields.includes("Credit amount"))
                  ? " is-invalid"
                  : ""
              }`}
              {...getGuidedFieldData("credit_amount")}
            >
              <span>{getCreditAmountLabel(formState.offer_type)}</span>
              <span className="casino-money-field-input-wrap">
                <span className="casino-money-field-prefix">£</span>
                <input
                  aria-describedby={getGuidedDescribedBy("credit_amount")}
                  aria-invalid={
                    offerIdentityValidationActive &&
                    (missingCampaignFields.includes("Cashback amount") ||
                      missingCampaignFields.includes("Refund / credit amount") ||
                      missingCampaignFields.includes("Free-play amount") ||
                      missingCampaignFields.includes("Credit amount"))
                  }
                  inputMode="decimal"
                  onBlur={() => normalizeMoneyField("credit_amount")}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, credit_amount: event.target.value }))
                  }
                  value={formState.credit_amount}
                />
                <button
                  aria-label="Open credit amount keypad"
                  className="casino-money-keypad-toggle"
                  onClick={() => toggleMoneyKeypad("credit_amount")}
                  type="button"
                >
                  <span aria-hidden="true" className="material-symbols-outlined">calculate</span>
                </button>
              </span>
              {activeMoneyKeypadField === "credit_amount" ? renderMoneyKeypad("credit_amount") : null}
            </label>
          ) : null}
          {showsWagerFields ? (
            <>
              {showsBonusAmountField ? (
                <label
                  className={`${getGuidedFieldClass("bonus_amount", `casino-money-field ${getCasinoMoneyToneClass(formState.bonus_amount)}`)}${
                    offerIdentityValidationActive && missingCampaignFields.includes("Bonus amount")
                      ? " is-invalid"
                      : ""
                  }`}
                  {...getGuidedFieldData("bonus_amount")}
                >
                <span>Bonus amount</span>
                  <span className="casino-money-field-input-wrap">
                    <span className="casino-money-field-prefix">£</span>
                    <input
                      aria-describedby={getGuidedDescribedBy("bonus_amount")}
                      aria-invalid={offerIdentityValidationActive && missingCampaignFields.includes("Bonus amount")}
                      inputMode="decimal"
                      onBlur={() => normalizeMoneyField("bonus_amount")}
                      onChange={(event) =>
                        setFormState((current) =>
                          applyDerivedWagerTarget({ ...current, bonus_amount: event.target.value })
                        )
                      }
                      value={formState.bonus_amount}
                    />
                    <button
                      aria-label="Open bonus amount keypad"
                      className="casino-money-keypad-toggle"
                      onClick={() => toggleMoneyKeypad("bonus_amount")}
                      type="button"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined">calculate</span>
                    </button>
                  </span>
                  {activeMoneyKeypadField === "bonus_amount" ? renderMoneyKeypad("bonus_amount") : null}
                </label>
              ) : null}
              {showsWagerMultiplierField ? (
                <>
                  <label
                    className={`${getGuidedFieldClass("wager_multiplier")}${
                      offerIdentityValidationActive && missingCampaignFields.includes("Wager multiplier")
                        ? " is-invalid"
                        : ""
                    }`}
                    {...getGuidedFieldData("wager_multiplier")}
                  >
                    <span>Wager multiplier</span>
                    <span className="casino-money-field-input-wrap casino-number-field-input-wrap">
                      <input
                        aria-describedby={getGuidedDescribedBy("wager_multiplier")}
                        aria-invalid={offerIdentityValidationActive && missingCampaignFields.includes("Wager multiplier")}
                        inputMode="decimal"
                        onChange={(event) =>
                          setFormState((current) =>
                            applyDerivedWagerTarget({
                              ...current,
                              wager_multiplier: event.target.value,
                            })
                          )
                        }
                        value={formState.wager_multiplier}
                      />
                      <button
                        aria-label="Open wager multiplier keypad"
                        className="casino-money-keypad-toggle"
                        onClick={() => toggleMoneyKeypad("wager_multiplier")}
                        type="button"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined">calculate</span>
                      </button>
                    </span>
                    {activeMoneyKeypadField === "wager_multiplier" ? renderMoneyKeypad("wager_multiplier") : null}
                  </label>
                  <div
                    aria-label="Common wagering multipliers"
                    className="field-span-2 casino-quick-chip-row"
                    data-pd-id="casino-offers.editor.wager-multiplier-chips"
                  >
                    {commonCasinoWagerMultipliers.map((multiplier) => (
                      <button
                        className={`review-chip review-chip-action${
                          formState.wager_multiplier === multiplier ? " is-active" : ""
                        }`}
                        key={multiplier}
                        onClick={() =>
                          setFormState((current) =>
                            applyDerivedWagerTarget({
                              ...current,
                              wager_multiplier: multiplier,
                            })
                          )
                        }
                        type="button"
                      >
                        x {multiplier}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
              <label
                className={`${getGuidedFieldClass("wager_target", `casino-money-field ${getCasinoMoneyToneClass(formState.wager_target)}`)}${
                  offerIdentityValidationActive && missingCampaignFields.includes("Wager target")
                    ? " is-invalid"
                    : ""
                }`}
                {...getGuidedFieldData("wager_target")}
              >
              <span>Wager target</span>
                <span className="casino-money-field-input-wrap">
                  <span className="casino-money-field-prefix">£</span>
                  <input
                    aria-describedby={getGuidedDescribedBy("wager_target")}
                    aria-invalid={offerIdentityValidationActive && missingCampaignFields.includes("Wager target")}
                    inputMode="decimal"
                    onBlur={() => normalizeMoneyField("wager_target")}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, wager_target: event.target.value }))
                    }
                    value={formState.wager_target}
                  />
                  <button
                    aria-label="Open wager target keypad"
                    className="casino-money-keypad-toggle"
                    onClick={() => toggleMoneyKeypad("wager_target")}
                    type="button"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined">calculate</span>
                  </button>
                </span>
                {activeMoneyKeypadField === "wager_target" ? renderMoneyKeypad("wager_target") : null}
              </label>
              {showsSpinStakeField ? (
                <>
                  <label
                    className={`${getGuidedFieldClass("spin_stake", "casino-money-field casino-money-field-prominent casino-money-field-neutral")}${
                      offerIdentityValidationActive && missingCampaignFields.includes("Spin stake")
                        ? " is-invalid"
                        : ""
                    }`}
                    {...getGuidedFieldData("spin_stake")}
                  >
                    <span>Spin stake</span>
                    <span className="casino-money-field-input-wrap">
                      <span className="casino-money-field-prefix">£</span>
                      <input
                        aria-describedby={getGuidedDescribedBy("spin_stake")}
                        aria-invalid={offerIdentityValidationActive && missingCampaignFields.includes("Spin stake")}
                        inputMode="decimal"
                        onBlur={() => normalizeMoneyField("spin_stake")}
                        onChange={(event) =>
                          setFormState((current) => ({ ...current, spin_stake: event.target.value }))
                        }
                        value={formState.spin_stake}
                      />
                      <button
                        aria-label="Open spin stake keypad"
                        className="casino-money-keypad-toggle"
                        onClick={() => toggleMoneyKeypad("spin_stake")}
                        type="button"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined">calculate</span>
                      </button>
                    </span>
                    {activeMoneyKeypadField === "spin_stake" ? renderMoneyKeypad("spin_stake") : null}
                    <span
                      aria-label="Common spin stakes"
                      className="casino-field-quick-chip-row"
                      data-pd-id="casino-offers.editor.wagering-spin-stake-chips"
                    >
                      {commonCasinoSpinStakes.map((stake) => (
                        <button
                          className={`review-chip review-chip-action${
                            formState.spin_stake === stake ? " is-active" : ""
                          }`}
                          key={stake}
                          onClick={() =>
                            setFormState((current) => ({
                              ...current,
                              spin_stake: stake,
                            }))
                          }
                          type="button"
                        >
                          £ {stake}
                        </button>
                      ))}
                    </span>
                  </label>
                </>
              ) : null}
              <section
                aria-label="Casino wagering helper"
                className="field-span-2 casino-wagering-helper"
                data-pd-id="casino-offers.editor.wagering-helper"
              >
                <span className="eyebrow">Wagering helper</span>
                <div className="casino-wagering-helper-grid">
                  {normalizedOfferType === "Deposit And Bonus Wagering" ? (
                    <span data-pd-id="casino-offers.editor.wagering-helper.deposit">
                      <small>Deposit</small>
                      <strong>{renderCasinoPlanningAmount(parseCasinoAmount(formState.cash_stake))}</strong>
                    </span>
                  ) : null}
                  {showsBonusAmountField ? (
                  <span data-pd-id="casino-offers.editor.wagering-helper.bonus">
                    <small>Bonus</small>
                    <strong>{renderCasinoPlanningAmount(parseCasinoAmount(formState.bonus_amount))}</strong>
                  </span>
                  ) : null}
                  {showsWagerMultiplierField ? (
                  <span data-pd-id="casino-offers.editor.wagering-helper.multiplier">
                    <small>Multiplier</small>
                    <strong>
                      {formState.wager_multiplier
                        ? `x ${formState.wager_multiplier.replace(/^x\s*/i, "")}`
                      : "Set multiplier"}
                    </strong>
                  </span>
                  ) : null}
                  <span data-pd-id="casino-offers.editor.wagering-helper.target">
                    <small>Target</small>
                    <strong>
                      {derivedWagerTargetResult.value === null
                        ? renderCasinoPlanningAmount(parseCasinoAmount(formState.wager_target))
                        : renderCasinoPlanningAmount(derivedWagerTargetResult.value)}
                    </strong>
                    <em>{derivedWagerTargetResult.formulaLabel}</em>
                  </span>
                  <span data-pd-id="casino-offers.editor.wagering-helper.spin-stake">
                    <small>Spin stake</small>
                    <strong>{renderCasinoPlanningAmount(parseCasinoAmount(formState.spin_stake))}</strong>
                  </span>
                  <span data-pd-id="casino-offers.editor.wagering-helper.spins-needed">
                    <small>Spins needed</small>
                    <strong>{derivedSpinsRequiredResult.actionableSpins ?? "Set stake"}</strong>
                    <em>
                      {derivedSpinsRequiredResult.actionableSpins === null
                        ? derivedSpinsRequiredResult.reason ?? "Enter target and stake."
                        : `${derivedSpinsRequiredResult.formulaLabel}`}
                    </em>
                  </span>
                  <span data-pd-id="casino-offers.editor.wagering-helper.exact-spins">
                    <small>Exact spins</small>
                    <strong>{formatCasinoSpinCount(derivedSpinsRequiredResult.exactSpins)}</strong>
                    <em>Rounded up for action</em>
                  </span>
                </div>
              </section>
            </>
          ) : null}
            </div>
            </fieldset>
          </EditorSection>
          </LedgerEditorTabPanel>
          <LedgerEditorTabPanel activeTabId={safeActiveEditorTabId} tabId="reward">
          {showsRewardSection ? (
          <EditorSection
            collapsible={false}
            headerAside={renderEditorSectionAside(
              "reward",
              !isSettledReadOnly && !rewardUnlocked ? (
                <span className="section-lock-chip">{getCasinoRewardLockReason(formState)}</span>
              ) : null
            )}
            invalid={
              offerIdentityValidationActive && rewardUnlocked && missingRewardFields.length > 0
            }
            title={getCasinoRewardHeading(formState.offer_type)}
          >
            {offerIdentityValidationActive && rewardUnlocked && missingRewardFields.length > 0 ? (
              <EditorValidationBanner
                dismissKey={`casino-offer-reward:${selectedId ?? formState.casino_offer_id ?? "new"}:${missingRewardFields.join("|")}`}
                id="casino-offer.editor.reward-validation"
                message={`Complete these reward fields: ${missingRewardFields.join(", ")}.`}
                title="Reward incomplete"
              />
            ) : null}
            <fieldset className="section-fieldset" disabled={isSettledReadOnly || !rewardUnlocked}>
            <div className="form-grid">
          {showsRewardSection ? (
            <>
              {showsRequiredSpinFields ? (
                <>
                  <label
                    className={`${getGuidedFieldClass("required_spins")}${
                      offerIdentityValidationActive && missingRewardFields.includes("Required spins")
                        ? " is-invalid"
                        : ""
                    }`}
                    {...getGuidedFieldData("required_spins")}
                  >
                    <span>Required spins</span>
                    <span className="casino-money-field-input-wrap casino-number-field-input-wrap">
                      <input
                        aria-describedby={getGuidedDescribedBy("required_spins")}
                        aria-invalid={offerIdentityValidationActive && missingRewardFields.includes("Required spins")}
                        inputMode="numeric"
                        onChange={(event) =>
                          setFormState((current) => ({ ...current, required_spins: event.target.value }))
                        }
                        value={formState.required_spins}
                      />
                      <button
                        aria-label="Open required spins keypad"
                        className="casino-money-keypad-toggle"
                        onClick={() => toggleMoneyKeypad("required_spins")}
                        type="button"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined">calculate</span>
                      </button>
                    </span>
                    {activeMoneyKeypadField === "required_spins" ? renderMoneyKeypad("required_spins") : null}
                  </label>
                  <label className="field-control">
                    <span>Derived required spins</span>
                    <input readOnly value={derivedRequiredSpins || "—"} />
                  </label>
                </>
              ) : null}
              {showsSpinStakeField && !showsWagerFields ? (
                <label
                  className={`${getGuidedFieldClass("spin_stake", "casino-money-field casino-money-field-prominent casino-money-field-neutral")}${
                    offerIdentityValidationActive && missingRewardFields.includes("Spin stake")
                      ? " is-invalid"
                      : ""
                  }`}
                  {...getGuidedFieldData("spin_stake")}
                >
                  <span>Spin stake</span>
                  <span className="casino-money-field-input-wrap">
                    <span className="casino-money-field-prefix">£</span>
                    <input
                      aria-describedby={getGuidedDescribedBy("spin_stake")}
                      aria-invalid={offerIdentityValidationActive && missingRewardFields.includes("Spin stake")}
                      inputMode="decimal"
                      onBlur={() => normalizeMoneyField("spin_stake")}
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, spin_stake: event.target.value }))
                      }
                      value={formState.spin_stake}
                    />
                    <button
                      aria-label="Open spin stake keypad"
                      className="casino-money-keypad-toggle"
                      onClick={() => toggleMoneyKeypad("spin_stake")}
                      type="button"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined">calculate</span>
                    </button>
                  </span>
                  {activeMoneyKeypadField === "spin_stake" ? renderMoneyKeypad("spin_stake") : null}
                  <span
                    aria-label="Common spin stakes"
                    className="casino-field-quick-chip-row"
                    data-pd-id="casino-offers.editor.spin-stake-chips"
                  >
                    {commonCasinoSpinStakes.map((stake) => (
                      <button
                        className={`review-chip review-chip-action${
                          formState.spin_stake === stake ? " is-active" : ""
                        }`}
                        key={stake}
                        onClick={() =>
                          setFormState((current) => ({
                            ...current,
                            spin_stake: stake,
                          }))
                        }
                        type="button"
                      >
                        £ {stake}
                      </button>
                    ))}
                  </span>
                </label>
              ) : null}
              {showsAwardedSpinsField ? (
                <label
                  className={`${getGuidedFieldClass("free_spins_awarded")}${
                    offerIdentityValidationActive && missingRewardFields.includes("Free spins awarded")
                      ? " is-invalid"
                      : ""
                  }`}
                  {...getGuidedFieldData("free_spins_awarded")}
                >
                  <span>Free spins awarded</span>
                  <span className="casino-money-field-input-wrap casino-number-field-input-wrap">
                    <input
                      aria-describedby={getGuidedDescribedBy("free_spins_awarded")}
                      aria-invalid={offerIdentityValidationActive && missingRewardFields.includes("Free spins awarded")}
                      inputMode="numeric"
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, free_spins_awarded: event.target.value }))
                      }
                      value={formState.free_spins_awarded}
                    />
                    <button
                      aria-label="Open free spins awarded keypad"
                      className="casino-money-keypad-toggle"
                      onClick={() => toggleMoneyKeypad("free_spins_awarded")}
                      type="button"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined">calculate</span>
                    </button>
                  </span>
                  {activeMoneyKeypadField === "free_spins_awarded" ? renderMoneyKeypad("free_spins_awarded") : null}
                </label>
              ) : null}
              {showsRewardValueField ? (
                <label
                  className={`${getGuidedFieldClass("free_spins_value", `casino-money-field casino-money-field-prominent ${getCasinoMoneyToneClass(formState.free_spins_value)}`)}${
                    offerIdentityValidationActive && missingRewardFields.includes(getRewardValueLabel(formState.offer_type))
                      ? " is-invalid"
                      : ""
                  }`}
                  {...getGuidedFieldData("free_spins_value")}
                >
                  <span>{getRewardValueLabel(formState.offer_type)}</span>
                  <span className="casino-money-field-input-wrap">
                    <span className="casino-money-field-prefix">£</span>
                    <input
                      aria-describedby={getGuidedDescribedBy("free_spins_value")}
                      aria-invalid={
                        offerIdentityValidationActive &&
                        missingRewardFields.includes(getRewardValueLabel(formState.offer_type))
                      }
                      inputMode="decimal"
                      onBlur={() => normalizeMoneyField("free_spins_value")}
                      onChange={(event) =>
                        setFormState((current) => applyCasinoRewardValueChange(current, event.target.value))
                      }
                      value={formState.free_spins_value}
                    />
                    <button
                      aria-label="Open converted value keypad"
                      className="casino-money-keypad-toggle"
                      onClick={() => toggleMoneyKeypad("free_spins_value")}
                      type="button"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined">calculate</span>
                    </button>
                  </span>
                  {activeMoneyKeypadField === "free_spins_value" ? renderMoneyKeypad("free_spins_value") : null}
                  <span
                    aria-label="Reward value quick actions"
                    className="casino-field-quick-chip-row"
                    data-pd-id="casino-offers.editor.reward-value-chips"
                  >
                    <button
                      className={`review-chip review-chip-action${
                        formState.free_spins_value === "0.00" ? " is-active" : ""
                      }`}
                      onClick={() => setFormState((current) => applyCasinoZeroRewardValue(current))}
                      type="button"
                    >
                      £ 0.00
                    </button>
                  </span>
                </label>
              ) : null}
              {showsRewardWageringControls ? (
                <>
                  <label
                    className={getGuidedFieldClass("wager_multiplier")}
                    {...getGuidedFieldData("wager_multiplier")}
                  >
                    <span>Reward wagering multiplier</span>
                    <span className="casino-money-field-input-wrap casino-number-field-input-wrap">
                      <input
                        aria-describedby={getGuidedDescribedBy("wager_multiplier")}
                        inputMode="decimal"
                        onChange={(event) =>
                          setFormState((current) =>
                            applyDerivedRewardWagerTarget({
                              ...current,
                              wager_multiplier: event.target.value,
                            })
                          )
                        }
                        value={formState.wager_multiplier}
                      />
                      <button
                        aria-label="Open reward wagering multiplier keypad"
                        className="casino-money-keypad-toggle"
                        onClick={() => toggleMoneyKeypad("wager_multiplier")}
                        type="button"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined">calculate</span>
                      </button>
                    </span>
                    {activeMoneyKeypadField === "wager_multiplier" ? renderMoneyKeypad("wager_multiplier") : null}
                  </label>
                  <label
                    className={`casino-money-field ${getCasinoMoneyToneClass(formState.wager_target)}`}
                  >
                    <span>Reward wager target</span>
                    <span className="casino-money-field-input-wrap">
                      <span className="casino-money-field-prefix">£</span>
                      <input
                        aria-describedby={getGuidedDescribedBy("wager_target")}
                        inputMode="decimal"
                        onBlur={() => normalizeMoneyField("wager_target")}
                        onChange={(event) =>
                          setFormState((current) => ({ ...current, wager_target: event.target.value }))
                        }
                        value={formState.wager_target}
                      />
                      <button
                        aria-label="Open reward wager target keypad"
                        className="casino-money-keypad-toggle"
                        onClick={() => toggleMoneyKeypad("wager_target")}
                        type="button"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined">calculate</span>
                      </button>
                    </span>
                    {activeMoneyKeypadField === "wager_target" ? renderMoneyKeypad("wager_target") : null}
                  </label>
                  <div
                    aria-label="Common reward multiplier chips"
                    className="field-span-2 casino-quick-chip-row"
                    data-pd-id="casino-offers.editor.reward-wager-multiplier-chips"
                  >
                    {commonCasinoWagerMultipliers.map((multiplier) => (
                      <button
                        className={`review-chip review-chip-action${
                          formState.wager_multiplier === multiplier ? " is-active" : ""
                        }`}
                        key={multiplier}
                        onClick={() =>
                          setFormState((current) =>
                            applyDerivedRewardWagerTarget({
                              ...current,
                              wager_multiplier: multiplier,
                            })
                          )
                        }
                        type="button"
                      >
                        x {multiplier}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
              {(showsWagerFields || showsRequiredSpinFields || showsRewardWageringControls) && showsSpinStakeField ? (
                <section
                  aria-label="Casino spins needed helper"
                  className="field-span-2 casino-wagering-helper casino-wagering-helper-reward"
                  data-pd-id="casino-offers.editor.reward-spins-helper"
                >
                  <span className="eyebrow">Spins helper</span>
                  <div className="casino-wagering-helper-grid">
                    {showsRewardWageringControls ? (
                      <>
                        <span data-pd-id="casino-offers.editor.reward-spins-helper.reward">
                          <small>Reward</small>
                          <strong>{renderCasinoPlanningAmount(parseCasinoAmount(formState.free_spins_value))}</strong>
                        </span>
                        <span data-pd-id="casino-offers.editor.reward-spins-helper.multiplier">
                          <small>Multiplier</small>
                          <strong>
                            {formState.wager_multiplier
                              ? `x ${formState.wager_multiplier.replace(/^x\s*/i, "")}`
                              : "Optional"}
                          </strong>
                        </span>
                      </>
                    ) : null}
                    <span data-pd-id="casino-offers.editor.reward-spins-helper.target">
                      <small>Target</small>
                      <strong>
                        {showsRewardWageringControls && derivedRewardWagerTargetResult.value !== null
                          ? renderCasinoPlanningAmount(derivedRewardWagerTargetResult.value)
                          : renderCasinoPlanningAmount(parseCasinoAmount(formState.wager_target))}
                      </strong>
                      <em>
                        {showsRewardWageringControls
                          ? derivedRewardWagerTargetResult.formulaLabel
                          : "Saved wager target"}
                      </em>
                    </span>
                    <span data-pd-id="casino-offers.editor.reward-spins-helper.spin-stake">
                      <small>Spin stake</small>
                      <strong>{renderCasinoPlanningAmount(parseCasinoAmount(formState.spin_stake))}</strong>
                    </span>
                    <span data-pd-id="casino-offers.editor.reward-spins-helper.spins-needed">
                      <small>Spins needed</small>
                      <strong>{derivedRewardSpinsRequiredResult.actionableSpins ?? "Set target"}</strong>
                      <em>
                        {derivedRewardSpinsRequiredResult.actionableSpins === null
                          ? derivedRewardSpinsRequiredResult.reason ?? "Enter target and stake."
                          : derivedRewardSpinsRequiredResult.formulaLabel}
                      </em>
                    </span>
                    <span data-pd-id="casino-offers.editor.reward-spins-helper.exact-spins">
                      <small>Exact spins</small>
                      <strong>{formatCasinoSpinCount(derivedRewardSpinsRequiredResult.exactSpins)}</strong>
                      <em>Rounded up for action</em>
                    </span>
                  </div>
                </section>
              ) : null}
            </>
          ) : null}
            </div>
            </fieldset>
          </EditorSection>
          ) : null}
          </LedgerEditorTabPanel>
          <LedgerEditorTabPanel activeTabId={safeActiveEditorTabId} tabId="settlement">
          <EditorSection
            collapsible={false}
            headerAside={
              renderEditorSectionAside("settlement")
            }
            invalid={offerIdentityValidationActive && missingSettlementFields.length > 0}
            title="Status and settlement"
          >
            {offerIdentityValidationActive && missingSettlementFields.length > 0 ? (
              <EditorValidationBanner
                dismissKey={`casino-offer-settlement:${selectedId ?? formState.casino_offer_id ?? "new"}:${missingSettlementFields.join("|")}`}
                id="casino-offer.editor.settlement-validation"
                message={`Complete these settlement fields: ${missingSettlementFields.join(", ")}.`}
                title="Settlement incomplete"
              />
            ) : null}
            <fieldset className="section-fieldset" disabled={isSettledReadOnly}>
            <div className="form-grid">
          <label className="field-control">
            <span>Status</span>
            <select
              onChange={(event) =>
                setFormState((current) => applyCasinoStatusDefaults(current, event.target.value))
              }
              value={formState.status}
            >
              {casinoOfferStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label
            className={`${getGuidedFieldClass("result")}${
              offerIdentityValidationActive && missingSettlementFields.includes("Result")
                ? " is-invalid"
                : ""
            }`}
            {...getGuidedFieldData("result")}
          >
            <span>Result</span>
            <select
              aria-describedby={getGuidedDescribedBy("result")}
              aria-invalid={offerIdentityValidationActive && missingSettlementFields.includes("Result")}
              onChange={(event) =>
                setFormState((current) => applyCasinoResultDefaults(current, event.target.value))
              }
              value={formState.result}
            >
              {resultOptions.map((option) => (
                <option key={option} value={option}>
                  {getCasinoResultLabel(formState.offer_type, option)}
                </option>
              ))}
            </select>
          </label>
          {quickSettlementOptions.length ? (
            <div
              aria-label="Casino quick settlement actions"
              className="field-span-2 tracker-nav quick-settlement-actions"
              data-pd-id="casino-offers.editor.quick-settlement-actions"
            >
              {quickSettlementOptions.map((option) => (
                <button
                  className="review-chip review-chip-action"
                  key={option}
                  onClick={() =>
                    setFormState((current) =>
                      applyCasinoResultDefaults(
                        applyCasinoStatusDefaults(current, "Settled"),
                        option
                      )
                    )
                  }
                  type="button"
                >
                  {getCasinoResultLabel(formState.offer_type, option)}
                </button>
              ))}
            </div>
          ) : null}
          <section
            aria-label="Casino settlement cash helper"
            className="casino-settlement-helper field-span-2"
            data-pd-id="casino-offers.editor.settlement-cash-helper"
          >
            <div className="casino-settlement-helper-header">
              <div>
                <span className="eyebrow">Settlement helper</span>
                <h4>Cash In Versus Cash Out</h4>
              </div>
              <div className="casino-settlement-suggestion">
                <span className="summary-label">Suggested net result</span>
                <strong>
                  {settlementNetSuggestion.value === null
                    ? renderCasinoFinancialValue(null, { zeroAsNumeric: true })
                    : renderCasinoFinancialValue(settlementNetSuggestion.value, { zeroAsNumeric: true })}
                </strong>
              </div>
            </div>
            <div className="casino-settlement-helper-grid">
              <label className={`casino-money-field ${getCasinoMoneyToneClass(formState.own_cash_committed)}`}>
                <span>Own Cash Committed</span>
                <span className="casino-money-field-input-wrap">
                  <span className="casino-money-field-prefix">£</span>
                  <input
                    inputMode="decimal"
                    onBlur={() => normalizeMoneyField("own_cash_committed")}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, own_cash_committed: event.target.value }))
                    }
                    value={formState.own_cash_committed}
                  />
                  <button
                    aria-label="Open own cash committed keypad"
                    className="casino-money-keypad-toggle"
                    onClick={() => toggleMoneyKeypad("own_cash_committed")}
                    type="button"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined">calculate</span>
                  </button>
                </span>
                {activeMoneyKeypadField === "own_cash_committed" ? renderMoneyKeypad("own_cash_committed") : null}
                <small className="casino-money-field-hint">
                  {ownCashCommittedSuggestion.sourceLabel}
                </small>
              </label>
              <label className={`casino-money-field ${getCasinoMoneyToneClass(formState.cash_returned)}`}>
                <span>Cash Returned</span>
                <span className="casino-money-field-input-wrap">
                  <span className="casino-money-field-prefix">£</span>
                  <input
                    inputMode="decimal"
                    onBlur={() => normalizeMoneyField("cash_returned")}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, cash_returned: event.target.value }))
                    }
                    value={formState.cash_returned}
                  />
                  <button
                    aria-label="Open cash returned keypad"
                    className="casino-money-keypad-toggle"
                    onClick={() => toggleMoneyKeypad("cash_returned")}
                    type="button"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined">calculate</span>
                  </button>
                </span>
                {activeMoneyKeypadField === "cash_returned" ? renderMoneyKeypad("cash_returned") : null}
              </label>
              <label className={`casino-money-field ${getCasinoMoneyToneClass(formState.free_spins_value)}`}>
                <span>Reward Converted</span>
                <span className="casino-money-field-input-wrap">
                  <span className="casino-money-field-prefix">£</span>
                  <input
                    inputMode="decimal"
                    onBlur={() => normalizeMoneyField("free_spins_value")}
                    onChange={(event) =>
                      setFormState((current) => applyCasinoRewardValueChange(current, event.target.value))
                    }
                    value={formState.free_spins_value}
                  />
                  <button
                    aria-label="Open reward converted keypad"
                    className="casino-money-keypad-toggle"
                    onClick={() => toggleMoneyKeypad("free_spins_value")}
                    type="button"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined">calculate</span>
                  </button>
                </span>
                {activeMoneyKeypadField === "free_spins_value" ? renderMoneyKeypad("free_spins_value") : null}
              </label>
              <label className={`casino-money-field ${getCasinoMoneyToneClass(formState.settlement_other_costs)}`}>
                <span>Other Costs</span>
                <span className="casino-money-field-input-wrap">
                  <span className="casino-money-field-prefix">£</span>
                  <input
                    inputMode="decimal"
                    onBlur={() => normalizeMoneyField("settlement_other_costs")}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, settlement_other_costs: event.target.value }))
                    }
                    value={formState.settlement_other_costs}
                  />
                  <button
                    aria-label="Open other settlement costs keypad"
                    className="casino-money-keypad-toggle"
                    onClick={() => toggleMoneyKeypad("settlement_other_costs")}
                    type="button"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined">calculate</span>
                  </button>
                </span>
                {activeMoneyKeypadField === "settlement_other_costs" ? renderMoneyKeypad("settlement_other_costs") : null}
              </label>
            </div>
            <div className="casino-settlement-helper-footer">
              <span className="summary-label">{settlementNetSuggestion.formulaLabel}</span>
              <button
                className="review-chip review-chip-copy"
                disabled={!ownCashCommittedSuggestion.value}
                onClick={() => {
                  const suggestedValue = ownCashCommittedSuggestion.value;
                  if (suggestedValue) {
                    setFormState((current) => ({
                      ...current,
                      own_cash_committed: suggestedValue,
                    }));
                  }
                }}
                type="button"
              >
                Use Suggested Cash
              </button>
              <button
                className="review-chip review-chip-copy"
                disabled={settlementNetSuggestion.state !== "calculable"}
                onClick={() => {
                  const suggestedValue = settlementNetSuggestion.value;
                  if (suggestedValue !== null) {
                    setFormState((current) => ({
                      ...current,
                      final_net_pnl: suggestedValue.toFixed(2),
                    }));
                  }
                }}
                type="button"
              >
                Use Suggested Net Result
              </button>
            </div>
          </section>
          <label
            className={`${getGuidedFieldClass("final_net_pnl", `casino-money-field ${getCasinoMoneyToneClass(formState.final_net_pnl)}`)}${
              offerIdentityValidationActive && missingSettlementFields.includes("Net Result")
                ? " is-invalid"
                : ""
            } field-span-2`}
            {...getGuidedFieldData("final_net_pnl")}
          >
            <span>Net Result</span>
            <span className="casino-money-field-input-wrap">
              <span className="casino-money-field-prefix">£</span>
              <input
                aria-describedby={getGuidedDescribedBy("final_net_pnl", "casino-editor-net-result-help")}
                aria-invalid={offerIdentityValidationActive && missingSettlementFields.includes("Net Result")}
                inputMode="decimal"
                onBlur={() => normalizeMoneyField("final_net_pnl")}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, final_net_pnl: event.target.value }))
                }
                value={formState.final_net_pnl}
              />
              <button
                aria-label="Open net result keypad"
                className="casino-money-keypad-toggle"
                onClick={() => toggleMoneyKeypad("final_net_pnl")}
                type="button"
              >
                <span aria-hidden="true" className="material-symbols-outlined">calculate</span>
              </button>
            </span>
            {activeMoneyKeypadField === "final_net_pnl" ? renderMoneyKeypad("final_net_pnl") : null}
            <small id="casino-editor-net-result-help">
              Enter 0.00 for break-even or a negative amount for a loss.
            </small>
          </label>
          <section
            aria-label={
              formState.result === "Pending"
                ? "Casino current value"
                : "Casino final outcome"
            }
            className={`settlement-outcome-panel field-span-2${
              formState.result !== "Pending" || formState.status === "Settled"
                ? " settlement-outcome-panel-final"
                : ""
            }`}
            data-pd-id="casino-offers.editor.settlement-outcomes"
          >
            <div className="settlement-outcome-primary">
              <span className="summary-label">{displayedValueLabel}</span>
              <strong>{renderCasinoFinancialValue(displayedNumericValue, { zeroAsNumeric: true })}</strong>
            </div>
            {formState.result === "Pending" ? (
              <div className="settlement-outcome-grid">
                <article className="settlement-outcome-card">
                  <span className="summary-label">Possible outcome</span>
                  <strong>{getCasinoPositiveOutcomeLabel(formState.offer_type, formState.result)}</strong>
                  {renderCasinoFinancialValue(displayedNumericValue, { zeroAsNumeric: true })}
                </article>
                <article className="settlement-outcome-card">
                  <span className="summary-label">Possible outcome</span>
                  <strong>{getCasinoNegativeOutcomeLabel(formState.offer_type, formState.result)}</strong>
                  {renderCasinoFinancialValue(displayedNumericValue, { zeroAsNumeric: true })}
                </article>
              </div>
            ) : (
              <div className="settlement-outcome-status">
                <span className="table-chip table-chip-success">Outcome hit</span>
                <strong>{getCasinoResultLabel(formState.offer_type, formState.result)}</strong>
              </div>
            )}
          </section>
            </div>
            </fieldset>
          </EditorSection>
          </LedgerEditorTabPanel>
          {showsAdvancedEditorTab ? (
          <LedgerEditorTabPanel activeTabId={safeActiveEditorTabId} tabId="advanced">
          <EditorSection
            collapsible={false}
            headerAside={renderEditorSectionAside("advanced")}
            title="Advanced controls"
          >
            {selectedRow?.calculation_notes.length ? (
              <section className="stack">
                <span className="eyebrow">Calculation notes</span>
                {selectedRow.calculation_notes.map((note) => (
                  <p className="lede" key={note}>
                    {note}
                  </p>
                ))}
              </section>
            ) : null}
            <fieldset className="section-fieldset" disabled={isSettledReadOnly}>
            <div className="form-grid">
              <label className="field-control">
                <span>Reference net value</span>
                <input
                  inputMode="decimal"
                  onBlur={() => normalizeMoneyField("calc_net_pnl")}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, calc_net_pnl: event.target.value }))
                  }
                  value={formState.calc_net_pnl}
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
          </LedgerEditorTabPanel>
          ) : null}
          <div className="field-span-2 workflow-editor-footer" data-pd-id="casino-offers.editor.actions">
            {selectedId && settledDeleteGuardRowId === selectedId ? (
              <LedgerSettledDeleteGuard
                disabled={isPersisting}
                ledgerLabel="casino-offers"
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
              {quickAddReturnValues && !selectedId ? (
                <button
                  className="review-chip"
                  disabled={isPersisting}
                  onClick={returnToFreeSpinsQuickAdd}
                  type="button"
                >
                  Back To Quick Add
                </button>
              ) : null}
              {isSettledReadOnly ? (
                <button
                  aria-label="Close casino editor"
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
              aria-label="Casino editor footer tab navigation"
              className="tracker-nav workflow-editor-footer-nav"
              data-pd-id="casino-offers.editor.footer-tab-actions"
              role="group"
            >
              <button
                className="review-chip review-chip-action-previous"
                disabled={!previousCasinoEditorTab}
                onClick={() => {
                  if (previousCasinoEditorTab) {
                    activateCasinoEditorTab(previousCasinoEditorTab.id as CasinoEditorTabId);
                  }
                }}
                type="button"
              >
                Previous
              </button>
              <button
                className="review-chip review-chip-action-next"
                disabled={!nextCasinoEditorTab}
                onClick={() => {
                  if (nextCasinoEditorTab) {
                    activateCasinoEditorTab(nextCasinoEditorTab.id as CasinoEditorTabId);
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
      {isQuickAddOpen ? (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isPersisting) setIsQuickAddOpen(false); }}>
          <div ref={quickAddRef}>
            <CasinoFreeSpinsQuickAdd
              bookmakerCatalogue={bookmakerCatalogue}
              bookmakerOptions={quickAddBookmakerOptions}
              errorMessage={errorMessage}
              initialValues={quickAddReturnValues}
              isSaving={isPersisting}
              key={profileId}
              onClose={() => {
                setErrorMessage("");
                setQuickAddReturnValues(null);
                setIsQuickAddOpen(false);
              }}
              onMoreDetails={openFreeSpinsQuickAddDetails}
              onSave={saveFreeSpinsQuickAdd}
              profileId={profileId}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
