"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { apiBaseUrl } from "@/lib/api";
import { getAccountNamesByType, type AccountAuthorityRecord } from "@/lib/account-authorities";
import { StatusToast } from "@/components/status-toast";
import { BookmakerIdentity, useBookmakerCatalogue } from "@/components/bookmaker-identity";
import { EditorSection } from "@/components/editor-section";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { LedgerAddRowButton } from "@/components/ledger-add-row-button";
import { FeeReviewResolutionBanner } from "@/components/fee-review-resolution-banner";
import type { CommonBetCombo } from "@/components/common-bet-combo-settings";
import { refreshFeeReviewResolutionSession, type FeeReviewResolutionContext } from "@/lib/fee-review-session";
import { getSettlementValidationMessage } from "@/lib/settlement-validation";
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
import { resolveCasinoBookmakerCoverage } from "@/lib/casino-offer-knowledge";
import { getCasinoOperationalIssueBadges } from "@/lib/operational-actions";
import {
  casinoOfferTypeOptions,
  casinoOfferResultOptions,
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
  status: string;
  result: string;
  calc_net_pnl: string;
  final_net_pnl: string;
  user_notes: string;
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
  { key: "offer_name", label: "Campaign Tag" },
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
    status: record.status,
    result: record.result,
    calc_net_pnl: record.calc_net_pnl,
    final_net_pnl: record.final_net_pnl,
    user_notes: record.user_notes,
  };
}

type CasinoOutcomeCardState = "possible" | "hit" | "missed" | "void" | "review";

const cashlessCasinoOfferTypes = new Set(["Free Spins"]);
const freeSpinCampaignTypes = new Set(["Free Spins", "Free Play", "Risk Free"]);
const wageringCampaignTypes = new Set(["Wager", "Deposit Bonus"]);

function getCasinoResultOptions(offerType: string): string[] {
  if (offerType === "Cashback") {
    return ["Pending", "Win", "Lose", "Void"];
  }

  if (freeSpinCampaignTypes.has(offerType)) {
    return ["Pending", "Win", "Lose", "Mixed", "Void"];
  }

  return [...casinoOfferResultOptions];
}

function applyCasinoOfferTypeDefaults(
  current: CasinoOfferFormState,
  nextOfferType: string
): CasinoOfferFormState {
  const nextResultValues = new Set(getCasinoResultOptions(nextOfferType));
  const nextState: CasinoOfferFormState = {
    ...current,
    offer_type: nextOfferType,
    result: nextResultValues.has(current.result) ? current.result : "Pending",
  };

  if (nextOfferType === "Free Spins") {
    return {
      ...nextState,
      cash_stake: "",
      credit_amount: "",
      bonus_amount: "",
      wager_multiplier: "",
      wager_target: "",
    };
  }

  if (nextOfferType === "Risk Free") {
    return {
      ...nextState,
      bonus_amount: "",
      wager_multiplier: "",
      wager_target: "",
    };
  }

  if (nextOfferType === "Free Play") {
    return {
      ...nextState,
      credit_amount: "",
      bonus_amount: "",
      wager_multiplier: "",
      wager_target: "",
    };
  }

  if (nextOfferType === "Cashback") {
    return {
      ...nextState,
      bonus_amount: "",
      wager_multiplier: "",
      wager_target: "",
      required_spins: "",
      spin_stake: "",
      free_spins_awarded: "",
      free_spins_value: "",
    };
  }

  if (wageringCampaignTypes.has(nextOfferType)) {
    return {
      ...nextState,
      credit_amount: "",
      required_spins: "",
      spin_stake: "",
      free_spins_awarded: "",
      free_spins_value: "",
    };
  }

  if (nextOfferType === "None") {
    return {
      ...nextState,
      credit_amount: "",
      bonus_amount: "",
      wager_multiplier: "",
      wager_target: "",
      required_spins: "",
      spin_stake: "",
      free_spins_awarded: "",
      free_spins_value: "",
    };
  }

  return nextState;
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

  return {
    ...current,
    result: nextResult,
    status: nextStatus,
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
  if (finalValue) {
    return finalValue;
  }

  const currentValue = formState.calc_net_pnl.trim();
  if (currentValue) {
    return currentValue;
  }

  return "—";
}

function getDisplayedCasinoValueLabelForForm(formState: CasinoOfferFormState): string {
  if (casinoPlaceholderStatuses.has(formState.status) && !formState.calc_net_pnl.trim()) {
    return "Current placeholder";
  }
  if (formState.status === "Settled" || formState.result !== "Pending") {
    return "Net result";
  }
  if (formState.calc_net_pnl.trim()) {
    return "Reference net value";
  }
  return "Value";
}

function getCasinoPlaceholderGuidance(status: string, offerType: string): string {
  if (status === "Prospecting") {
    return offerType.trim()
      ? "Prospecting row only. Capture the campaign shell now and enter a current value once the offer is active."
      : "Prospecting row only. Set the offer family before entering campaign economics.";
  }
  return "Enter campaign values once the offer is active.";
}

function getCasinoSettlesSummary(formState: CasinoOfferFormState): string {
  if (formState.date_settling.trim()) {
    return formatDisplayDate(formState.date_settling);
  }
  if (formState.date_started.trim()) {
    return `${formatDisplayDate(formState.date_started)} (defaults from start)`;
  }
  return "—";
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
  if (wageringCampaignTypes.has(offerType)) {
    return "Qualifying and wagering";
  }
  if (offerType === "Cashback") {
    return "Cashback economics";
  }
  if (offerType === "Risk Free") {
    return "Qualifying and refund path";
  }
  if (offerType === "Free Spins") {
    return "Free-spin campaign";
  }
  if (offerType === "Free Play") {
    return "Free-play campaign";
  }
  if (offerType === "None") {
    return "Casino stake details";
  }
  if (freeSpinCampaignTypes.has(offerType)) {
    return "Campaign and reward details";
  }
  return "Campaign values";
}

function getCasinoRewardHeading(offerType: string): string {
  if (offerType === "Risk Free") {
    return "Risk-free return";
  }
  if (offerType === "Free Play") {
    return "Free-play return";
  }
  if (offerType === "Free Spins") {
    return "Spin and conversion";
  }
  return "Spin and reward";
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
  if (offerType === "Cashback") {
    return "Cashback amount";
  }
  if (offerType === "Free Play") {
    return "Free-play amount";
  }
  if (offerType === "Risk Free") {
    return "Refund / credit amount";
  }
  return "Credit amount";
}

function getRewardValueLabel(offerType: string): string {
  if (offerType === "Free Play") {
    return "Free-play value";
  }
  if (offerType === "Risk Free") {
    return "Returned credit value";
  }
  return "Free spins value";
}

function getDerivedRequiredSpins(wagerTarget: string, spinStake: string): string {
  const normalizedWagerTarget = wagerTarget.trim();
  const normalizedSpinStake = spinStake.trim();
  if (!normalizedWagerTarget || !normalizedSpinStake) {
    return "";
  }

  const targetValue = Number(normalizedWagerTarget);
  const stakeValue = Number(normalizedSpinStake);
  if (!Number.isFinite(targetValue) || !Number.isFinite(stakeValue) || stakeValue <= 0) {
    return "";
  }

  return String(Math.ceil(targetValue / stakeValue));
}

function getCasinoPositiveOutcomeLabel(
  offerType: string,
  result: string
): string {
  if (freeSpinCampaignTypes.has(offerType)) {
    return result === "Pending" ? "Spins convert well" : "Spins converted well";
  }
  if (offerType === "Cashback") {
    return result === "Pending" ? "Cashback lands" : "Cashback landed";
  }
  if (offerType === "Deposit Bonus" || offerType === "Wager") {
    return result === "Pending" ? "Offer converts well" : "Offer converted well";
  }
  return result === "Pending" ? "Campaign ends positive" : "Campaign ended positive";
}

function getCasinoResultLabel(offerType: string, result: string): string {
  if (result === "Pending") {
    if (offerType === "Cashback") {
      return "Pending cashback";
    }
    if (offerType === "Risk Free") {
      return "Pending risk-free outcome";
    }
    if (freeSpinCampaignTypes.has(offerType)) {
      return "Pending reward outcome";
    }
    if (offerType === "Deposit Bonus" || offerType === "Wager") {
      return "Pending offer outcome";
    }
    return "Pending";
  }

  if (result === "Win") {
    if (offerType === "Cashback") {
      return "Cashback landed";
    }
    if (offerType === "Risk Free") {
      return "Refund returned";
    }
    if (freeSpinCampaignTypes.has(offerType)) {
      return "Reward converted";
    }
    if (offerType === "Deposit Bonus" || offerType === "Wager") {
      return "Offer converted";
    }
  }

  if (result === "Lose") {
    if (offerType === "Cashback") {
      return "Cashback missed";
    }
    if (offerType === "Risk Free") {
      return "Refund missed";
    }
    if (freeSpinCampaignTypes.has(offerType)) {
      return "Reward missed";
    }
    if (offerType === "Deposit Bonus" || offerType === "Wager") {
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
  if (freeSpinCampaignTypes.has(offerType)) {
    return result === "Pending" ? "Spins underperform" : "Spins underperformed";
  }
  if (offerType === "Cashback") {
    return result === "Pending" ? "Cashback misses" : "Cashback missed";
  }
  if (offerType === "Deposit Bonus" || offerType === "Wager") {
    return result === "Pending" ? "Offer underperforms" : "Offer underperformed";
  }
  return result === "Pending" ? "Campaign ends negative" : "Campaign ended negative";
}

function getCasinoOutcomeCardState(result: string, key: "positive" | "negative"): CasinoOutcomeCardState {
  if (result === "Pending") {
    return "possible";
  }
  if (result === "Void") {
    return "void";
  }
  if (result === "Mixed") {
    return "review";
  }
  if (result === "Win") {
    return key === "positive" ? "hit" : "missed";
  }
  if (result === "Lose") {
    return key === "negative" ? "hit" : "missed";
  }
  return "possible";
}

function getMissingRequiredFields(formState: CasinoOfferFormState): string[] {
  const missing: string[] = [];
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

function getMissingCampaignFields(formState: CasinoOfferFormState): string[] {
  if (casinoPlaceholderStatuses.has(formState.status)) {
    return [];
  }

  const missing: string[] = [];

  if (
    !cashlessCasinoOfferTypes.has(formState.offer_type) &&
    formState.offer_type.trim().length > 0 &&
    !formState.cash_stake.trim()
  ) {
    missing.push("Cash stake");
  }

  if (wageringCampaignTypes.has(formState.offer_type)) {
    if (!formState.bonus_amount.trim()) {
      missing.push("Bonus amount");
    }
    if (!formState.wager_multiplier.trim()) {
      missing.push("Wager multiplier");
    }
    if (!formState.wager_target.trim()) {
      missing.push("Wager target");
    }
  }

  if (formState.offer_type === "Cashback" && !formState.credit_amount.trim()) {
    missing.push("Cashback amount");
  }

  if (formState.offer_type === "Risk Free" && !formState.credit_amount.trim()) {
    missing.push("Refund / credit amount");
  }

  if (formState.offer_type === "Free Play" && !formState.credit_amount.trim()) {
    missing.push("Free-play amount");
  }

  return missing;
}

function getMissingRewardFields(formState: CasinoOfferFormState): string[] {
  if (casinoPlaceholderStatuses.has(formState.status)) {
    return [];
  }

  const missing: string[] = [];

  if (formState.offer_type === "Free Spins") {
    if (!formState.spin_stake.trim()) {
      missing.push("Spin stake");
    }
    if (!formState.free_spins_awarded.trim()) {
      missing.push("Free spins awarded");
    }
    if (!formState.free_spins_value.trim()) {
      missing.push("Free spins value");
    }
  }

  if (formState.offer_type === "Free Play") {
    if (!formState.spin_stake.trim()) {
      missing.push("Spin stake");
    }
    if (!formState.required_spins.trim() && !getDerivedRequiredSpins(formState.wager_target, formState.spin_stake)) {
      missing.push("Required spins");
    }
    if (!formState.free_spins_value.trim()) {
      missing.push("Free-play value");
    }
  }

  if (formState.offer_type === "Risk Free" && !formState.free_spins_value.trim()) {
    missing.push("Returned credit value");
  }

  return missing;
}

function getOutcomeCardLabel(state: CasinoOutcomeCardState): string {
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

function parseCasinoAmount(value: string | null | undefined): number {
  if (!value?.trim()) {
    return 0;
  }

  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
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
  const [rows, setRows] = useState<CasinoOfferRecord[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [accountAuthorities, setAccountAuthorities] = useState<AccountAuthorityRecord[]>([]);
  const [commonBetCombos, setCommonBetCombos] = useState<CommonBetCombo[]>([]);
  const [selectedComboId, setSelectedComboId] = useState("");
  const [lookupValues, setLookupValues] = useState<LookupValueRecord[]>([]);
  const [trackerSettings, setTrackerSettings] = useState<TrackerSettingsRecord | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workflowVisible, setWorkflowVisible] = useState(false);
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

  const loadRows = useCallback(
    async (preferredSelection?: string | null) => {
      const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/casino-offers`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Unable to load casino-offer rows");
      }

      const nextRows = (await response.json()) as CasinoOfferRecord[];
      startTransition(() => {
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
      void Promise.all([loadRows(initialRecordId), loadAccountAuthorities(), loadLookupValues(), loadTrackerSettings(), loadCommonBetCombos()]).catch(
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
  const isPlaceholderStatus = casinoPlaceholderStatuses.has(formState.status);
  const showsCashStake =
    formState.offer_type.trim().length > 0 && !cashlessCasinoOfferTypes.has(formState.offer_type);
  const showsWagerFields = wageringCampaignTypes.has(formState.offer_type);
  const showsCreditAmountField = new Set(["Cashback", "Free Play", "Risk Free"]).has(
    formState.offer_type
  );
  const showsRewardSection = freeSpinCampaignTypes.has(formState.offer_type);
  const showsRequiredSpinFields = formState.offer_type === "Free Play";
  const showsSpinStakeField = new Set(["Free Spins", "Free Play"]).has(formState.offer_type);
  const showsAwardedSpinsField = formState.offer_type === "Free Spins";
  const showsRewardValueField = new Set(["Free Spins", "Free Play", "Risk Free"]).has(
    formState.offer_type
  );
  const derivedRequiredSpins = useMemo(
    () => getDerivedRequiredSpins(formState.wager_target, formState.spin_stake),
    [formState.spin_stake, formState.wager_target]
  );
  const resultOptions = useMemo(
    () => getCasinoResultOptions(formState.offer_type),
    [formState.offer_type]
  );
  const missingOfferIdentityFields = useMemo(() => getMissingRequiredFields(formState), [formState]);
  const missingCampaignFields = useMemo(() => getMissingCampaignFields(formState), [formState]);
  const missingRewardFields = useMemo(() => getMissingRewardFields(formState), [formState]);
  const offerSetupComplete = missingOfferIdentityFields.length === 0;
  const campaignUnlocked = offerSetupComplete && Boolean(formState.offer_type.trim());
  const rewardUnlocked = campaignUnlocked && showsRewardSection;
  const offerIdentityValidationActive = showOfferIdentityValidation;
  const displayedValue = getDisplayedCasinoValueForForm(formState);
  const displayedValueLabel = getDisplayedCasinoValueLabelForForm(formState);
  const hasResolvedCasinoValue = Boolean(formState.calc_net_pnl.trim() || formState.final_net_pnl.trim());
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
  const quickView = useMemo(() => {
    const rangeRows = rows.filter((row) =>
      isDateWithinResolvedRange(getCasinoRangeAnchor(row), resolvedDateRange)
    );
    const rewardLedRows = rangeRows.filter((row) => freeSpinCampaignTypes.has(row.offer_type));
    const wageringRows = rangeRows.filter((row) => wageringCampaignTypes.has(row.offer_type));
    const cashbackRows = rangeRows.filter((row) => row.offer_type === "Cashback");
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
  }, [resolvedDateRange, rows]);

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
    setFormState((current) => ({
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
    }));
    const choice = selectable.length > 1 ? ` Choose one of ${selectable.length} eligible bookmakers.` : "";
    const warning = selectable.find((row) => row.state === "warning");
    setStatusMessage(`${combo.name} applied to this unsaved casino draft.${choice}${warning ? ` ${warning.reason}.` : ""}`);
  }

  const offerTypeOptions = useMemo(
    () =>
      dedupeOptions([
        ...casinoOfferTypeOptions,
        ...rows.map((row) => row.offer_type),
        formState.offer_type,
      ]),
    [formState.offer_type, rows]
  );

  const offerNameOptions = useMemo(() => {
    const casinoOfferNames = getLookupValuesByType(lookupValues, "casino_offer_name");
    if (casinoOfferNames.length > 0) {
      return dedupeOptions([...casinoOfferNames, formState.offer_name]);
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
    const fallbackRowOfferNames = fallbackRows.map((row) => row.offer_name);
    const sourceRows = scopedRows.length > 0 ? scopedRows : fallbackRows;
    return dedupeOptions([
      ...sourceRows.map((row) => row.offer_name),
      ...fallbackRowOfferNames,
      formState.offer_name,
    ]);
  }, [formState.bookmaker, formState.offer_name, formState.offer_type, lookupValues, rows]);

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
        .filter((row) => freeSpinCampaignTypes.has(row.offer_type))
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
        .filter((row) => wageringCampaignTypes.has(row.offer_type))
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
        .filter((row) => row.offer_type === "Cashback")
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
  }, [feeReviewContext, sortedReviewRows, tableFilters]);

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

  function selectRow(rowId: string, options?: { collapseTable?: boolean }) {
    if (rowId !== selectedId && isDirty && !confirmDiscardChanges()) {
      return;
    }
    const record = rows.find((entry) => entry.casino_offer_id === rowId);
    if (!record) {
      return;
    }
    setSelectedId(rowId);
    setSelectedComboId("");
    isCreatingDraftRef.current = false;
    setWorkflowVisible(true);
    const nextFormState = recordToForm(record);
    setFormState(nextFormState);
    setPristineFormState(nextFormState);
    setErrorMessage("");
    setShowOfferIdentityValidation(false);
    setSettledEditEnabled(false);
    setStatusMessage(`Opened casino offer ${rowId} for editing.`);
    setTableCollapsed(Boolean(options?.collapseTable));
    revealEditor({ expandLedger: !options?.collapseTable });
  }

  function startNewRow() {
    if (isDirty && !confirmDiscardChanges()) {
      return;
    }
    setSelectedId(null);
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
    setStatusMessage("New casino offer ready. Complete the required fields, then save.");
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

  function buildPersistForm(nextFormState: CasinoOfferFormState): CasinoOfferFormState {
    return {
      ...nextFormState,
      date_settling: nextFormState.date_settling || nextFormState.date_started,
    };
  }

  function canPersistForm(nextFormState: CasinoOfferFormState): boolean {
    return (
      getMissingRequiredFields(nextFormState).length === 0 &&
      getMissingCampaignFields(nextFormState).length === 0 &&
      getMissingRewardFields(nextFormState).length === 0
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
    setErrorMessage("");
    const resolvedFormState = buildPersistForm(nextFormState);
    if (!options?.skipWorkflowValidation && !canPersistForm(resolvedFormState)) {
      setShowOfferIdentityValidation(true);
      if (!options?.suppressMissingRequiredMessage) {
        const missingFields = [
          ...getMissingRequiredFields(resolvedFormState),
          ...getMissingCampaignFields(resolvedFormState),
          ...getMissingRewardFields(resolvedFormState),
        ];
        setStatusMessage(`Complete required casino-offer fields before saving: ${missingFields.join(", ")}.`);
      }
      return false;
    }

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
    await loadRows(saved.casino_offer_id);
    setShowOfferIdentityValidation(false);
    setSettledEditEnabled(false);
    if (options?.returnToLedgerOnSuccess ?? !options?.autosaveLabel) {
      setWorkflowVisible(false);
      setTableCollapsed(false);
    }
    setStatusMessage(
      options?.autosaveLabel
        ? `${options.autosaveLabel} autosaved for ${saved.casino_offer_id}.`
        : isEditing
          ? `Updated casino offer ${saved.casino_offer_id}.`
          : `Created casino offer ${saved.casino_offer_id}.`
    );
    return true;
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
    if (selectedRow) {
      const nextFormState = recordToForm(selectedRow);
      setFormState(nextFormState);
      setPristineFormState(nextFormState);
      setErrorMessage("");
      setShowOfferIdentityValidation(false);
      setSettledEditEnabled(false);
      setStatusMessage(`Reverted unsaved changes for casino offer ${selectedRow.casino_offer_id}.`);
      return;
    }

    const blankForm = createBlankForm();
    setSelectedComboId("");
    setFormState(blankForm);
    setPristineFormState(blankForm);
    setErrorMessage("");
    setShowOfferIdentityValidation(false);
    setSettledEditEnabled(false);
    setStatusMessage("Cleared the unsaved casino-offer draft.");
  }

  async function handleDeleteSelectedRow(rowId = selectedId) {
    if (!rowId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete casino row ${rowId}? This will remove it from this profile tracker.`
    );
    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/casino-offers/${rowId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setErrorMessage((await response.text()) || "Unable to delete casino-offer row");
      return;
    }

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
            onClick={() => selectRow(sourceRow.casino_offer_id)}
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
      {feeReviewContext ? (
        <FeeReviewResolutionBanner
          context={feeReviewContext}
          hasUnsavedChanges={isDirty}
          onSaveAndLeave={() => persistForm(formState, { returnToLedgerOnSuccess: false })}
        />
      ) : null}
      <StatusToast message={statusMessage} onDismiss={clearStatusMessage} />
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
          <article className="stat-card">
            <span className="eyebrow">Open / prospecting</span>
            <strong>
              {quickView.openCount} / {quickView.prospectingCount}
            </strong>
            <span>Active rows • Placeholder rows</span>
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
            <strong>{formatMoney(quickView.totalResolvedValue)}</strong>
            <span>Current ledger total</span>
          </article>
        </section>
        <div className="sportsbook-review-bar" aria-label="Casino-offer ledger controls" role="toolbar">
          <label className="field-control table-search-field"><span className="visually-hidden">Search casino-offer rows</span><input aria-label="Search casino-offer rows" onChange={(event) => { setQuery(event.target.value); setCurrentPage(1); }} placeholder="Search casino-offer rows" type="search" value={query} /></label>
          <LedgerAddRowButton label="Add casino row" onClick={startNewRow} />
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
                          onClick={() => selectRow(rowId)}
                          onDoubleClick={() => selectRow(rowId, { collapseTable: true })}
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
                    : casinoOfferResultOptions
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
        <div className="modal-backdrop" onClick={closeEditor}>
      <section
        aria-label={selectedId ? "Edit casino row" : "Create casino row"}
        aria-modal="true"
        className="content-panel stack workflow-editor-panel modal-panel workflow-editor-modal"
        data-pd-id="casino-offers.editor.dialog"
        onClick={(event) => event.stopPropagation()}
        ref={editorRef}
        role="dialog"
      >
        <div className="workflow-panel-header workflow-editor-header" data-pd-id="casino-offers.editor.header">
          <div className="stack">
            <span className="eyebrow">{selectedId ? "Edit casino row" : "Create casino row"}</span>
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
            <button aria-label="Close casino-offer editor" className="button-link" data-initial-focus="" onClick={closeEditor} type="button">
              Close
            </button>
          </div>
        </div>
        <div className="workflow-editor-body">
        {initialRecordId === selectedId && !hasResolvedCasinoValue ? (
          <div className="validation-message" role="status">
            Final value required. Select <strong>Edit settled row</strong>, then enter the
            confirmed result under <strong>Net Result (Profit/Loss)</strong> in Advanced controls.
          </div>
        ) : null}
        <section className="stat-strip" aria-label="Casino-offer summary">
          <article className="stat-card">
            <span className="eyebrow">{displayedValueLabel}</span>
            <strong>{displayedValue}</strong>
            <span>Status: {formState.status || "—"}</span>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Settles</span>
            <strong>{getCasinoSettlesSummary(formState)}</strong>
            <span>
              Open:{" "}
              {formState.status === "Prospecting" ||
              formState.status === "Started" ||
              formState.status === "In Progress"
                ? "Yes"
                : "No"}
            </span>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Expiry</span>
            <strong>{formState.expiry_datetime ? formatDisplayDate(formState.expiry_datetime) : "—"}</strong>
            <span>{isPlaceholderStatus ? "Fill offer setup first" : formState.result || "Result pending"}</span>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Offer path</span>
            <strong>{formState.offer_type || "Offer type pending"}</strong>
            <span>
              {[
                formState.bookmaker,
                formState.game,
              ]
                .filter(Boolean)
                .join(" • ") ||
                "Bookmaker and game pending"}
            </span>
          </article>
        </section>
        {isPlaceholderStatus && !hasResolvedCasinoValue ? (
          <section className="stat-strip" aria-label="Casino placeholder guidance">
            <article className="stat-card">
              <span className="eyebrow">Current bankroll value</span>
              <strong>{displayedValue}</strong>
              <span>{displayedValueLabel}</span>
            </article>
            <article className="stat-card">
              <span className="eyebrow">Next step</span>
              <strong>{formState.offer_type || "Choose offer type"}</strong>
              <span>{getCasinoPlaceholderGuidance(formState.status, formState.offer_type)}</span>
            </article>
          </section>
        ) : (
          <section
            className="stat-strip"
            aria-label={formState.result === "Pending" ? "Casino possible outcomes" : "Casino outcome review"}
          >
            <article className="stat-card">
              <span className="eyebrow">{getOutcomeCardLabel(getCasinoOutcomeCardState(formState.result, "positive"))}</span>
              <strong>{getCasinoPositiveOutcomeLabel(formState.offer_type, formState.result)}</strong>
              <span>
                {displayedValueLabel}: {displayedValue}
              </span>
            </article>
            <article className="stat-card">
              <span className="eyebrow">{getOutcomeCardLabel(getCasinoOutcomeCardState(formState.result, "negative"))}</span>
              <strong>{getCasinoNegativeOutcomeLabel(formState.offer_type, formState.result)}</strong>
              <span>
                {displayedValueLabel}: {displayedValue}
              </span>
            </article>
          </section>
        )}
        <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
          <EditorSection
            headerAside={
              isSettledReadOnly ? <span className="section-lock-chip">Settled row locked</span> : null
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
              <p className="field-validation-text" role="alert">
                Complete the required Offer identity fields: {missingOfferIdentityFields.join(", ")}.
              </p>
            ) : null}
            <fieldset className="section-fieldset" disabled={isSettledReadOnly}>
            <div className="form-grid">
              <label
                className={`field-control${
                  offerIdentityValidationActive && !formState.date_started.trim() ? " is-invalid" : ""
                }`}
              >
                <span>Date started</span>
                <input
                  aria-invalid={offerIdentityValidationActive && !formState.date_started.trim()}
                  type="datetime-local"
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      date_started: event.target.value,
                      date_settling:
                        current.date_settling.trim().length > 0 ? current.date_settling : event.target.value,
                    }))
                  }
                  required
                  value={formState.date_started}
                />
              </label>
              <label className="field-control">
                <span>Date settling</span>
                <input
                  type="datetime-local"
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, date_settling: event.target.value }))
                  }
                  value={formState.date_settling}
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
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Offer type</span>
                <select
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
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control field-span-2">
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
          <EditorSection
            headerAside={
              isSettledReadOnly ? (
                <span className="section-lock-chip">Settled row locked</span>
              ) : !campaignUnlocked ? (
                <span className="section-lock-chip">{getCasinoCampaignLockReason(formState)}</span>
              ) : null
            }
            invalid={
              offerIdentityValidationActive && campaignUnlocked && missingCampaignFields.length > 0
            }
            title={getCasinoCampaignHeading(formState.offer_type)}
          >
            {offerIdentityValidationActive && campaignUnlocked && missingCampaignFields.length > 0 ? (
              <p className="field-validation-text" role="alert">
                Complete the required campaign fields: {missingCampaignFields.join(", ")}.
              </p>
            ) : null}
            <fieldset className="section-fieldset" disabled={isSettledReadOnly || !campaignUnlocked}>
            <div className="form-grid">
          {formState.offer_type === "Free Spins" ? (
            <label className="field-control field-span-2">
              <span>Cash stake</span>
              <input
                readOnly
                value="Not used on Free Spins rows."
              />
            </label>
          ) : null}
          {formState.offer_type === "Risk Free" ? (
            <label className="field-control field-span-2">
              <span>Risk-free path</span>
              <input
                readOnly
                value="Keep the qualifying cash stake and record the refund separately."
              />
            </label>
          ) : null}
          {formState.offer_type === "Cashback" ? (
            <label className="field-control field-span-2">
              <span>Cashback path</span>
              <input
                readOnly
                value="Record the qualifying stake first, then the cashback amount."
              />
            </label>
          ) : null}
          {showsCashStake ? (
            <label
              className={`field-control${
                offerIdentityValidationActive && missingCampaignFields.includes("Cash stake")
                  ? " is-invalid"
                  : ""
              }`}
            >
              <span>{formState.offer_type === "Wager" ? "Qualifying cash stake" : "Cash stake"}</span>
              <input
                aria-invalid={offerIdentityValidationActive && missingCampaignFields.includes("Cash stake")}
                inputMode="decimal"
                onChange={(event) =>
                  setFormState((current) => ({ ...current, cash_stake: event.target.value }))
                }
                value={formState.cash_stake}
              />
            </label>
          ) : null}
          {showsCreditAmountField ? (
            <label
              className={`field-control${
                offerIdentityValidationActive &&
                (missingCampaignFields.includes("Cashback amount") ||
                  missingCampaignFields.includes("Refund / credit amount") ||
                  missingCampaignFields.includes("Free-play amount"))
                  ? " is-invalid"
                  : ""
              }`}
            >
              <span>{getCreditAmountLabel(formState.offer_type)}</span>
              <input
                aria-invalid={
                  offerIdentityValidationActive &&
                  (missingCampaignFields.includes("Cashback amount") ||
                    missingCampaignFields.includes("Refund / credit amount") ||
                    missingCampaignFields.includes("Free-play amount"))
                }
                inputMode="decimal"
                onChange={(event) =>
                  setFormState((current) => ({ ...current, credit_amount: event.target.value }))
                }
                value={formState.credit_amount}
              />
            </label>
          ) : null}
          {showsWagerFields ? (
            <>
              <label
                className={`field-control${
                  offerIdentityValidationActive && missingCampaignFields.includes("Bonus amount")
                    ? " is-invalid"
                    : ""
                }`}
              >
                <span>Bonus amount</span>
                <input
                  aria-invalid={offerIdentityValidationActive && missingCampaignFields.includes("Bonus amount")}
                  inputMode="decimal"
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, bonus_amount: event.target.value }))
                  }
                  value={formState.bonus_amount}
                />
              </label>
              <label
                className={`field-control${
                  offerIdentityValidationActive && missingCampaignFields.includes("Wager multiplier")
                    ? " is-invalid"
                    : ""
                }`}
              >
                <span>Wager multiplier</span>
                <input
                  aria-invalid={offerIdentityValidationActive && missingCampaignFields.includes("Wager multiplier")}
                  inputMode="decimal"
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      wager_multiplier: event.target.value,
                    }))
                  }
                  value={formState.wager_multiplier}
                />
              </label>
              <label
                className={`field-control${
                  offerIdentityValidationActive && missingCampaignFields.includes("Wager target")
                    ? " is-invalid"
                    : ""
                }`}
              >
                <span>Wager target</span>
                <input
                  aria-invalid={offerIdentityValidationActive && missingCampaignFields.includes("Wager target")}
                  inputMode="decimal"
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, wager_target: event.target.value }))
                  }
                  value={formState.wager_target}
                />
              </label>
            </>
          ) : null}
            </div>
            </fieldset>
          </EditorSection>
          {showsRewardSection ? (
          <EditorSection
            headerAside={
              isSettledReadOnly ? (
                <span className="section-lock-chip">Settled row locked</span>
              ) : !rewardUnlocked ? (
                <span className="section-lock-chip">{getCasinoRewardLockReason(formState)}</span>
              ) : null
            }
            invalid={
              offerIdentityValidationActive && rewardUnlocked && missingRewardFields.length > 0
            }
            title={getCasinoRewardHeading(formState.offer_type)}
          >
            {offerIdentityValidationActive && rewardUnlocked && missingRewardFields.length > 0 ? (
              <p className="field-validation-text" role="alert">
                Complete the required reward fields: {missingRewardFields.join(", ")}.
              </p>
            ) : null}
            <fieldset className="section-fieldset" disabled={isSettledReadOnly || !rewardUnlocked}>
            <div className="form-grid">
          {showsRewardSection ? (
            <>
              {showsRequiredSpinFields ? (
                <>
                  <label
                    className={`field-control${
                      offerIdentityValidationActive && missingRewardFields.includes("Required spins")
                        ? " is-invalid"
                        : ""
                    }`}
                  >
                    <span>Required spins</span>
                    <input
                      aria-invalid={offerIdentityValidationActive && missingRewardFields.includes("Required spins")}
                      inputMode="numeric"
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, required_spins: event.target.value }))
                      }
                      value={formState.required_spins}
                    />
                  </label>
                  <label className="field-control">
                    <span>Derived required spins</span>
                    <input readOnly value={derivedRequiredSpins || "—"} />
                  </label>
                </>
              ) : null}
              {showsSpinStakeField ? (
                <label
                  className={`field-control${
                    offerIdentityValidationActive && missingRewardFields.includes("Spin stake")
                      ? " is-invalid"
                      : ""
                  }`}
                >
                  <span>Spin stake</span>
                  <input
                    aria-invalid={offerIdentityValidationActive && missingRewardFields.includes("Spin stake")}
                    inputMode="decimal"
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, spin_stake: event.target.value }))
                    }
                    value={formState.spin_stake}
                  />
                </label>
              ) : null}
              {showsAwardedSpinsField ? (
                <label
                  className={`field-control${
                    offerIdentityValidationActive && missingRewardFields.includes("Free spins awarded")
                      ? " is-invalid"
                      : ""
                  }`}
                >
                  <span>Free spins awarded</span>
                  <input
                    aria-invalid={offerIdentityValidationActive && missingRewardFields.includes("Free spins awarded")}
                    inputMode="numeric"
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, free_spins_awarded: event.target.value }))
                    }
                    value={formState.free_spins_awarded}
                  />
                </label>
              ) : null}
              {showsRewardValueField ? (
                <label
                  className={`field-control${
                    offerIdentityValidationActive &&
                    (missingRewardFields.includes("Free spins value") ||
                      missingRewardFields.includes("Free-play value") ||
                      missingRewardFields.includes("Returned credit value"))
                      ? " is-invalid"
                      : ""
                  }`}
                >
                  <span>{getRewardValueLabel(formState.offer_type)}</span>
                  <input
                    aria-invalid={
                      offerIdentityValidationActive &&
                      (missingRewardFields.includes("Free spins value") ||
                        missingRewardFields.includes("Free-play value") ||
                        missingRewardFields.includes("Returned credit value"))
                    }
                    inputMode="decimal"
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, free_spins_value: event.target.value }))
                    }
                    value={formState.free_spins_value}
                  />
                </label>
              ) : null}
            </>
          ) : null}
            </div>
            </fieldset>
          </EditorSection>
          ) : null}
          <EditorSection
            headerAside={
              isSettledReadOnly ? <span className="section-lock-chip">Settled row locked</span> : null
            }
            title="Status and settlement"
          >
            <fieldset className="section-fieldset" disabled={isSettledReadOnly}>
            <div className="form-grid">
          <label className="field-control">
            <span>Status</span>
            <select
              onChange={(event) =>
                void applyDropdownChange(
                  (current) => applyCasinoStatusDefaults(current, event.target.value),
                  "Status change"
                )
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
          <label className="field-control">
            <span>Result</span>
            <select
              onChange={(event) =>
                void applyDropdownChange(
                  (current) => applyCasinoResultDefaults(current, event.target.value),
                  "Result change"
                )
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
            </div>
            </fieldset>
          </EditorSection>
          <EditorSection
            defaultOpen={Boolean(initialRecordId === selectedId && !hasResolvedCasinoValue)}
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
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, calc_net_pnl: event.target.value }))
                  }
                  value={formState.calc_net_pnl}
                />
              </label>
              <label className="field-control">
                <span>Net Result (Profit/Loss)</span>
                <input
                  aria-describedby="casino-editor-net-result-help"
                  inputMode="decimal"
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, final_net_pnl: event.target.value }))
                  }
                  value={formState.final_net_pnl}
                />
                <small id="casino-editor-net-result-help">
                  Settled bankroll result. Enter 0 for break-even or a negative amount for a loss.
                </small>
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
          <div className="tracker-nav field-span-2 workflow-editor-footer" data-pd-id="casino-offers.editor.actions">
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
            <button aria-label="Close casino-offer editor" className="button-link tracker-nav-right-action" onClick={closeEditor} type="button">
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
