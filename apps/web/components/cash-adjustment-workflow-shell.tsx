"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { apiBaseUrl } from "@/lib/api";
import {
  fetchJsonAndCache,
  invalidateCachedJson,
  readCachedJson,
  TRACKER_STALE_WHILE_REFRESH_MS,
} from "@/lib/client-json-cache";
import { dispatchTrackerDataUpdated } from "@/lib/tracker-data-events";
import { getAllAccountNames, type AccountAuthorityRecord } from "@/lib/account-authorities";
import { FinancialValue } from "@/components/financial-value";
import { StatusToast } from "@/components/status-toast";
import { EditorSection } from "@/components/editor-section";
import { EditorValidationBanner } from "@/components/editor-validation-banner";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { LedgerAddRowButton } from "@/components/ledger-add-row-button";
import { LedgerPagination } from "@/components/ledger-pagination";
import { LedgerTableScroll } from "@/components/ledger-table-scroll";
import { LedgerEditorTabPanel, LedgerEditorTabRail } from "@/components/ledger-editor-tabs";
import { LedgerSettledDeleteGuard } from "@/components/ledger-settled-delete-guard";
import { TrackerRangeCard } from "@/components/tracker-range-card";
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
import type { TableColumn } from "@/lib/tracker-modules";
import { saveTrackerDatePreset } from "@/lib/tracker-settings-client";
import { formatFinancialValue } from "@/lib/financial-display";
import {
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
  cashAdjustmentDirectionOptions,
  cashAdjustmentTypeOptions,
  dedupeOptions,
} from "@/lib/workbook-options";
import { type LedgerEditorTabDefinition } from "@/lib/ledger-editor-tabs";

type CashAdjustmentRecord = {
  cash_adjustment_id: string;
  profile_id: string;
  adjustment_date: string;
  direction: string;
  amount: string;
  adjustment_type: string;
  affects_investment: boolean;
  affects_cash_snapshot: boolean;
  linked_account: string;
  description: string;
  created_at: string;
  updated_at: string;
  signed_amount: string | null;
  week_label: string;
  calculation_state: string;
  calculation_notes: string[];
};

const lockedFeeWithdrawalTypes = new Set([
  "Management Fee Withdrawal",
  "Investment Fee Withdrawal",
]);

type CashAdjustmentFormState = {
  cash_adjustment_id?: string;
  adjustment_date: string;
  direction: string;
  amount: string;
  adjustment_type: string;
  affects_investment: boolean;
  affects_cash_snapshot: boolean;
  linked_account: string;
  description: string;
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

type CashAdjustmentTableMode =
  | "recent"
  | "withdrawals"
  | "costs"
  | "investment"
  | "cash-snapshot";
type CashAdjustmentEditorTabId = "details" | "scope" | "notes" | "advanced";
type CashAdjustmentGuidedFieldKey =
  | "adjustment_date"
  | "amount"
  | "adjustment_type"
  | "direction"
  | "linked_account"
  | "scope";
type CashAdjustmentGuidedEntry = {
  state: "next_required" | "review_required" | "complete";
  nextRequiredField: CashAdjustmentGuidedFieldKey | null;
  message: string;
};

type CashAdjustmentIssueFilter = "any" | "no-account" | "no-scope";
type CashAdjustmentSortKey = "adjustment_date" | "adjustment_type" | "signed_amount" | "calculation_state";
type CashAdjustmentSortDirection = "asc" | "desc";
type CashAdjustmentTableSort = {
  key: CashAdjustmentSortKey;
  direction: CashAdjustmentSortDirection;
};
type CashAdjustmentTableFilterState = {
  direction: string;
  adjustment_type: string;
  affects_investment: string;
  affects_cash_snapshot: string;
  calculation_state: string;
  issue_type: CashAdjustmentIssueFilter;
  min_value: string;
  max_value: string;
};

type CashAdjustmentColumnKey =
  | "cash_adjustment_id"
  | "adjustment_date"
  | "direction"
  | "adjustment_type"
  | "amount"
  | "signed_amount"
  | "affects_investment"
  | "affects_cash_snapshot"
  | "linked_account"
  | "description"
  | "week_label"
  | "calculation_state"
  | "actions";

const cashAdjustmentTableColumns: TableColumn[] = [
  { key: "cash_adjustment_id", label: "Adjustment ID" },
  { key: "adjustment_date", label: "Date" },
  { key: "direction", label: "Direction" },
  { key: "adjustment_type", label: "Type" },
  { key: "amount", label: "Amount", align: "end" },
  { key: "signed_amount", label: "Signed amount", align: "end" },
  { key: "affects_investment", label: "Investment" },
  { key: "affects_cash_snapshot", label: "Cash snapshot" },
  { key: "linked_account", label: "Linked account" },
  { key: "description", label: "Description" },
  { key: "week_label", label: "Week label" },
  { key: "calculation_state", label: "Calc state" },
  { key: "actions", label: "Actions" },
];

const defaultVisibleCashAdjustmentColumns = new Set<CashAdjustmentColumnKey>([
  "cash_adjustment_id",
  "adjustment_date",
  "direction",
  "adjustment_type",
  "amount",
  "signed_amount",
  "affects_investment",
  "affects_cash_snapshot",
  "linked_account",
  "description",
  "week_label",
  "calculation_state",
  "actions",
]);

const hideableCashAdjustmentColumnKeys = new Set<CashAdjustmentColumnKey>([
  "cash_adjustment_id",
  "adjustment_date",
  "direction",
  "adjustment_type",
  "affects_investment",
  "affects_cash_snapshot",
  "linked_account",
  "description",
  "week_label",
  "calculation_state",
]);

const defaultCashAdjustmentColumnWidths: Record<CashAdjustmentColumnKey, number> = {
  cash_adjustment_id: 160,
  adjustment_date: 180,
  direction: 110,
  adjustment_type: 140,
  amount: 120,
  signed_amount: 135,
  affects_investment: 120,
  affects_cash_snapshot: 135,
  linked_account: 150,
  description: 220,
  week_label: 140,
  calculation_state: 130,
  actions: 110,
};

const positiveDirectionTypes = new Set(["Deposit", "TopUp"]);
const negativeDirectionTypes = new Set(["Withdrawal", "Deduction", "Subscription"]);
const costAdjustmentTypes = new Set(["Deduction", "Subscription", "Costs"]);
const cashAdjustmentTableModes: Array<{ value: CashAdjustmentTableMode; label: string }> = [
  { value: "recent", label: "Recent" },
  { value: "withdrawals", label: "Withdrawals" },
  { value: "costs", label: "Costs" },
  { value: "investment", label: "Investment" },
  { value: "cash-snapshot", label: "Cash snapshot" },
];

const emptyTableFilters: CashAdjustmentTableFilterState = {
  direction: "",
  adjustment_type: "",
  affects_investment: "",
  affects_cash_snapshot: "",
  calculation_state: "",
  issue_type: "any",
  min_value: "",
  max_value: "",
};

const cashAdjustmentGuidedFieldTabMap: Record<
  CashAdjustmentGuidedFieldKey,
  CashAdjustmentEditorTabId
> = {
  adjustment_date: "details",
  amount: "details",
  adjustment_type: "details",
  direction: "details",
  linked_account: "scope",
  scope: "scope",
};

const cashAdjustmentGuidedTabLabels: Record<CashAdjustmentEditorTabId, string> = {
  details: "Details",
  scope: "Scope",
  notes: "Notes",
  advanced: "Advanced",
};

function getCashAdjustmentIssueBadges(
  row: Pick<CashAdjustmentRecord, "linked_account" | "affects_investment" | "affects_cash_snapshot">
): Array<{ label: string; tone: "warning" | "danger" }> {
  const issues: Array<{ label: string; tone: "warning" | "danger" }> = [];
  if (!row.linked_account.trim()) {
    issues.push({ label: "No Account", tone: "warning" });
  }
  if (!row.affects_investment && !row.affects_cash_snapshot) {
    issues.push({ label: "No Scope", tone: "warning" });
  }
  return issues;
}

function getCashAdjustmentIssueFilterMatch(
  row: CashAdjustmentRecord,
  issueType: CashAdjustmentIssueFilter
): boolean {
  if (issueType === "any") {
    return true;
  }
  const labels = new Set(getCashAdjustmentIssueBadges(row).map((badge) => badge.label));
  if (issueType === "no-account") {
    return labels.has("No Account");
  }
  if (issueType === "no-scope") {
    return labels.has("No Scope");
  }
  return true;
}

function isSortableCashAdjustmentColumn(columnKey: string): columnKey is CashAdjustmentSortKey {
  return (
    columnKey === "adjustment_date" ||
    columnKey === "adjustment_type" ||
    columnKey === "signed_amount" ||
    columnKey === "calculation_state"
  );
}
function toDateTimeInputValue(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  const [datePart, timePart = "00:00:00"] = normalized.replace("T", " ").split(" ");
  return `${datePart}T${timePart.slice(0, 5)}`;
}

function formatUkDateTime(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  const candidate = normalized.includes("T") ? normalized : normalized.replace(" ", "T");
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) {
    return normalized;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}

function formatMoneyValue(value: string | null | undefined): string {
  const normalized = value?.trim();
  if (!normalized) {
    return "—";
  }

  const numeric = Number(normalized.replace(/,/g, ""));
  if (!Number.isFinite(numeric)) {
    return normalized;
  }

  return formatFinancialValue(numeric);
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

function parseCurrencyLikeValue(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized.replace(/[£,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function getSignedAmountPreview(direction: string, amount: string): string {
  const normalized = amount.trim();
  if (!normalized) {
    return "—";
  }

  const numeric = Number(normalized.replace(/,/g, ""));
  if (!Number.isFinite(numeric)) {
    return normalized;
  }

  const signedNumeric = direction === "In" ? numeric : -Math.abs(numeric);
  return formatFinancialValue(signedNumeric);
}

function getSignedAmountNumericPreview(direction: string, amount: string): number | null {
  const normalized = amount.trim();
  if (!normalized) {
    return null;
  }

  const numeric = Number(normalized.replace(/,/g, ""));
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return direction === "In" ? numeric : -Math.abs(numeric);
}

function getAdjustmentScopeLabel(
  affectsInvestment: boolean,
  affectsCashSnapshot: boolean
): string {
  if (affectsInvestment && affectsCashSnapshot) {
    return "Investment and cash";
  }
  if (affectsInvestment) {
    return "Investment only";
  }
  if (affectsCashSnapshot) {
    return "Cash snapshot only";
  }
  return "Audit only";
}

function getAllowedAdjustmentTypes(direction: string): string[] {
  return cashAdjustmentTypeOptions.filter((option) => {
    if (direction === "In") {
      return !negativeDirectionTypes.has(option);
    }
    if (direction === "Out") {
      return !positiveDirectionTypes.has(option);
    }
    return true;
  });
}

function hasInvalidDirectionTypeCombination(formState: CashAdjustmentFormState): boolean {
  if (formState.direction === "In" && negativeDirectionTypes.has(formState.adjustment_type)) {
    return true;
  }
  if (formState.direction === "Out" && positiveDirectionTypes.has(formState.adjustment_type)) {
    return true;
  }
  return false;
}

function getMissingRequiredFields(formState: CashAdjustmentFormState): string[] {
  const missing: string[] = [];
  if (!formState.adjustment_date.trim()) {
    missing.push("Adjustment date");
  }
  if (!formState.amount.trim()) {
    missing.push("Amount");
  }
  return missing;
}

function getCashAdjustmentGuidedEntry(
  formState: CashAdjustmentFormState
): CashAdjustmentGuidedEntry {
  if (!formState.adjustment_date.trim()) {
    return {
      state: "next_required",
      nextRequiredField: "adjustment_date",
      message: "Set The Adjustment Date.",
    };
  }
  if (!formState.amount.trim()) {
    return {
      state: "next_required",
      nextRequiredField: "amount",
      message: "Add The Amount.",
    };
  }
  if (hasInvalidDirectionTypeCombination(formState)) {
    return {
      state: "review_required",
      nextRequiredField: "adjustment_type",
      message: "Choose A Workbook-Safe Adjustment Type.",
    };
  }
  if (!formState.linked_account.trim()) {
    return {
      state: "review_required",
      nextRequiredField: "linked_account",
      message: "Choose The Linked Account.",
    };
  }
  if (!formState.affects_investment && !formState.affects_cash_snapshot) {
    return {
      state: "review_required",
      nextRequiredField: "scope",
      message: "Choose At Least One Reporting Scope.",
    };
  }
  return {
    state: "complete",
    nextRequiredField: null,
    message: "Cash Adjustment Ready.",
  };
}

function createBlankForm(): CashAdjustmentFormState {
  return {
    adjustment_date: "",
    direction: "Out",
    amount: "",
    adjustment_type: "Withdrawal",
    affects_investment: true,
    affects_cash_snapshot: true,
    linked_account: "",
    description: "",
  };
}

function recordToForm(record: CashAdjustmentRecord): CashAdjustmentFormState {
  return {
    cash_adjustment_id: record.cash_adjustment_id,
    adjustment_date: toDateTimeInputValue(record.adjustment_date),
    direction: record.direction,
    amount: record.amount,
    adjustment_type: record.adjustment_type,
    affects_investment: record.affects_investment,
    affects_cash_snapshot: record.affects_cash_snapshot,
    linked_account: record.linked_account,
    description: record.description,
  };
}

function applyDirectionDefaults(
  current: CashAdjustmentFormState,
  nextDirection: string
): CashAdjustmentFormState {
  const nextAllowedTypes = getAllowedAdjustmentTypes(nextDirection);
  return {
    ...current,
    direction: nextDirection,
    adjustment_type: nextAllowedTypes.includes(current.adjustment_type)
      ? current.adjustment_type
      : nextAllowedTypes[0] ?? "Correction",
  };
}

function applyAdjustmentTypeDefaults(
  current: CashAdjustmentFormState,
  nextAdjustmentType: string
): CashAdjustmentFormState {
  if (nextAdjustmentType === "Deposit" || nextAdjustmentType === "TopUp") {
    return {
      ...current,
      adjustment_type: nextAdjustmentType,
      direction: "In",
      affects_cash_snapshot: true,
    };
  }

  if (
    nextAdjustmentType === "Withdrawal" ||
    nextAdjustmentType === "Deduction" ||
    nextAdjustmentType === "Subscription"
  ) {
    return {
      ...current,
      adjustment_type: nextAdjustmentType,
      direction: "Out",
      affects_cash_snapshot: true,
    };
  }

  return {
    ...current,
    adjustment_type: nextAdjustmentType,
  };
}

function sortCashAdjustmentsByDate(rows: CashAdjustmentRecord[]): CashAdjustmentRecord[] {
  return [...rows].sort((left, right) => {
    const rightDate = Date.parse(right.adjustment_date);
    const leftDate = Date.parse(left.adjustment_date);

    if (Number.isFinite(rightDate) && Number.isFinite(leftDate)) {
      return rightDate - leftDate;
    }

    if (Number.isFinite(rightDate)) {
      return 1;
    }

    if (Number.isFinite(leftDate)) {
      return -1;
    }

    return right.created_at.localeCompare(left.created_at);
  });
}

export function CashAdjustmentWorkflowShell({ profileId }: { profileId: string }) {
  const [guidedAccessMode] = useProfileGuidedAccessMode(profileId);
  const guidedAccessEnabled = isGuidedAccessEnabled(guidedAccessMode);
  const [rows, setRows] = useState<CashAdjustmentRecord[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [accountAuthorities, setAccountAuthorities] = useState<AccountAuthorityRecord[]>([]);
  const [trackerSettings, setTrackerSettings] = useState<TrackerSettingsRecord | null>(null);
  const [isTrackerRangeSaving, setIsTrackerRangeSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workflowVisible, setWorkflowVisible] = useState(false);
  const [tableCollapsed, setTableCollapsed] = usePersistedBoolean(
    `openforge-ledger-collapsed:${profileId}:cash-adjustments`,
    false
  );
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<CashAdjustmentColumnKey>>(
    () => new Set(defaultVisibleCashAdjustmentColumns)
  );
  const [columnWidths, setColumnWidths] = useState<
    Partial<Record<CashAdjustmentColumnKey, number>>
  >(defaultCashAdjustmentColumnWidths);
  const [tableFilters, setTableFilters] = usePersistedState<CashAdjustmentTableFilterState>(
    `openforge-ledger-table-filters:${profileId}:cash-adjustments`,
    emptyTableFilters
  );
  const [tableSort, setTableSort] = useState<CashAdjustmentTableSort | null>(null);
  const [formState, setFormState] = useState<CashAdjustmentFormState>(createBlankForm);
  const [pristineFormState, setPristineFormState] =
    useState<CashAdjustmentFormState>(createBlankForm);
  const [tableMode, setTableMode] = usePersistedState<CashAdjustmentTableMode>(
    `openforge-ledger-table-mode:${profileId}:cash-adjustments`,
    "recent"
  );
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [settledDeleteGuardRowId, setSettledDeleteGuardRowId] = useState<string | null>(null);
  const [settledDeleteReason, setSettledDeleteReason] = useState("");
  const [resolvedEditEnabled, setResolvedEditEnabled] = useState(false);
  const [showAdjustmentValidation, setShowAdjustmentValidation] = useState(false);
  const [activeEditorTabId, setActiveEditorTabId] =
    useState<CashAdjustmentEditorTabId>("details");
  const [guidedEntryDismissed, setGuidedEntryDismissed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isPersisting, setIsPersisting] = useState(false);
  const editorRef = useRef<HTMLElement | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const workflowVisibleRef = useRef(workflowVisible);
  const activeEditorTabIdRef = useRef<CashAdjustmentEditorTabId>(activeEditorTabId);
  const isCreatingDraftRef = useRef(false);

  const isPersistingRef = useRef(false);
  const [pageSize, setPageSize] = useState(8);
  const isDirty = useMemo(
    () => JSON.stringify(formState) !== JSON.stringify(pristineFormState),
    [formState, pristineFormState]
  );
  const confirmDiscardChanges = useUnsavedChangesGuard(workflowVisible && isDirty);
  const clearStatusMessage = useCallback(() => setStatusMessage(""), []);
  const tableColumns = useMemo(
    () =>
      cashAdjustmentTableColumns.filter((column) =>
        visibleColumnKeys.has(column.key as CashAdjustmentColumnKey)
      ),
    [visibleColumnKeys]
  );
  const hiddenColumnCount = useMemo(
    () =>
      Array.from(hideableCashAdjustmentColumnKeys).filter(
        (columnKey) => !visibleColumnKeys.has(columnKey)
      ).length,
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

  const hasOpenModal = workflowVisible || isFilterModalOpen;

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
    workflowVisibleRef.current = workflowVisible;
  }, [workflowVisible]);

  useEffect(() => {
    activeEditorTabIdRef.current = activeEditorTabId;
  }, [activeEditorTabId]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const loadRows = useCallback(
    async (preferredSelection?: string | null) => {
      const url = `${apiBaseUrl}/profiles/${profileId}/cash-adjustments`;
      const cachedRows = readCachedJson<CashAdjustmentRecord[]>(
        url,
        TRACKER_STALE_WHILE_REFRESH_MS
      );
      if (cachedRows) {
        setRows(cachedRows);
        setIsInitialLoading(false);
      }

      const nextRows = await fetchJsonAndCache<CashAdjustmentRecord[]>(url);
      startTransition(() => {
        setRows(nextRows);
        setIsInitialLoading(false);
        const nextSelectedCandidate =
          preferredSelection === undefined ? selectedIdRef.current : preferredSelection;
        const selected =
          nextSelectedCandidate &&
          nextRows.some((row) => row.cash_adjustment_id === nextSelectedCandidate)
            ? nextSelectedCandidate
            : null;
        setSelectedId(selected);
        if (selected) {
          isCreatingDraftRef.current = false;
          const activeRecord = nextRows.find((row) => row.cash_adjustment_id === selected);
          if (activeRecord) {
            const nextFormState = recordToForm(activeRecord);
            const isReloadingCurrentEditor =
              workflowVisibleRef.current &&
              selectedIdRef.current === selected;
            setFormState(nextFormState);
            setPristineFormState(nextFormState);
            setShowAdjustmentValidation(false);
            setGuidedEntryDismissed(false);
            if (!isReloadingCurrentEditor) {
              setActiveEditorTabId("details");
            } else {
              setActiveEditorTabId(activeEditorTabIdRef.current);
            }
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
          setShowAdjustmentValidation(false);
          setGuidedEntryDismissed(false);
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
      void Promise.all([loadRows(), loadAccountAuthorities(), loadTrackerSettings()]).catch((error: Error) => {
        setIsInitialLoading(false);
        setErrorMessage(error.message);
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadAccountAuthorities, loadRows, loadTrackerSettings]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.cash_adjustment_id === selectedId) ?? null,
    [rows, selectedId]
  );
  const isResolvedReadOnly = Boolean(
    selectedRow?.calculation_state?.toLowerCase() === "resolved" && !resolvedEditEnabled
  );

  const accountOptions = useMemo(
    () =>
      dedupeOptions([
        ...getAllAccountNames(accountAuthorities),
        ...rows.map((row) => row.linked_account),
        formState.linked_account,
      ]),
    [accountAuthorities, formState.linked_account, rows]
  );

  const allowedAdjustmentTypes = useMemo(
    () => getAllowedAdjustmentTypes(formState.direction),
    [formState.direction]
  );

  const reviewRows = useMemo(() => {
    if (tableMode === "withdrawals") {
      return sortCashAdjustmentsByDate(
        rows.filter((row) => row.adjustment_type === "Withdrawal")
      );
    }

    if (tableMode === "costs") {
      return sortCashAdjustmentsByDate(
        rows.filter((row) => costAdjustmentTypes.has(row.adjustment_type))
      );
    }

    if (tableMode === "investment") {
      return sortCashAdjustmentsByDate(rows.filter((row) => row.affects_investment));
    }

    if (tableMode === "cash-snapshot") {
      return sortCashAdjustmentsByDate(rows.filter((row) => row.affects_cash_snapshot));
    }

    return sortCashAdjustmentsByDate(rows);
  }, [rows, tableMode]);

  const toggleColumnVisibility = useCallback(
    (columnKey: CashAdjustmentColumnKey) => {
      if (!hideableCashAdjustmentColumnKeys.has(columnKey)) {
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
      columnKey: CashAdjustmentColumnKey,
      headerCell: HTMLTableCellElement | null
    ) => {
      event.preventDefault();
      event.stopPropagation();
      const startingWidth =
        headerCell?.getBoundingClientRect().width ??
        columnWidths[columnKey] ??
        defaultCashAdjustmentColumnWidths[columnKey];
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
      columnKey: CashAdjustmentColumnKey,
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
    <TKey extends keyof CashAdjustmentTableFilterState>(
      key: TKey,
      value: CashAdjustmentTableFilterState[TKey]
    ) => {
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

  const toggleTableSort = useCallback((key: CashAdjustmentSortKey) => {
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

      if (tableSort.key === "adjustment_date") {
        const leftValue = Date.parse(left.adjustment_date);
        const rightValue = Date.parse(right.adjustment_date);
        return ((Number.isFinite(leftValue) ? leftValue : 0) - (Number.isFinite(rightValue) ? rightValue : 0)) * direction;
      }

      if (tableSort.key === "signed_amount") {
        const leftValue = Number((left.signed_amount ?? "").replace(/,/g, ""));
        const rightValue = Number((right.signed_amount ?? "").replace(/,/g, ""));
        return ((Number.isFinite(leftValue) ? leftValue : 0) - (Number.isFinite(rightValue) ? rightValue : 0)) * direction;
      }

      const leftValue = String(left[tableSort.key] ?? "").toLowerCase();
      const rightValue = String(right[tableSort.key] ?? "").toLowerCase();
      return leftValue.localeCompare(rightValue, "en-GB") * direction;
    });
    return nextRows;
  }, [reviewRows, tableSort]);

  const cashAdjustmentRowsById = useMemo(
    () => new Map(rows.map((row) => [row.cash_adjustment_id, row])),
    [rows]
  );

  const cashAdjustmentFilterOptions = useMemo(
    () => ({
      directions: dedupeOptions(rows.map((row) => row.direction)),
      adjustmentTypes: dedupeOptions(rows.map((row) => row.adjustment_type)),
      calculationStates: dedupeOptions(rows.map((row) => row.calculation_state)),
    }),
    [rows]
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

  const filteredSourceRows = useMemo(() => {
    return sortedReviewRows.filter((row) => {
      if (!isDateWithinResolvedRange(parseDateValue(row.adjustment_date), resolvedDateRange)) {
        return false;
      }
      if (tableFilters.direction && row.direction !== tableFilters.direction) {
        return false;
      }
      if (tableFilters.adjustment_type && row.adjustment_type !== tableFilters.adjustment_type) {
        return false;
      }
      if (tableFilters.affects_investment && (row.affects_investment ? "Yes" : "No") !== tableFilters.affects_investment) {
        return false;
      }
      if (tableFilters.affects_cash_snapshot && (row.affects_cash_snapshot ? "Yes" : "No") !== tableFilters.affects_cash_snapshot) {
        return false;
      }
      if (tableFilters.calculation_state && row.calculation_state !== tableFilters.calculation_state) {
        return false;
      }
      if (!getCashAdjustmentIssueFilterMatch(row, tableFilters.issue_type)) {
        return false;
      }
      const rowValue = Number((row.signed_amount ?? "").replace(/,/g, ""));
      const minValue = parseCurrencyLikeValue(tableFilters.min_value);
      const maxValue = parseCurrencyLikeValue(tableFilters.max_value);
      if (minValue !== null && Number.isFinite(rowValue) && rowValue < minValue) {
        return false;
      }
      if (maxValue !== null && Number.isFinite(rowValue) && rowValue > maxValue) {
        return false;
      }
      return true;
    });
  }, [resolvedDateRange, sortedReviewRows, tableFilters]);

  const filteredRows = useMemo(() => {
    const tableRows: TrackerRow[] = filteredSourceRows.map((row) => ({
      cash_adjustment_id: row.cash_adjustment_id,
      adjustment_date: formatUkDateTime(row.adjustment_date),
      direction: row.direction,
      adjustment_type: row.adjustment_type,
      amount: formatMoneyValue(row.amount),
      signed_amount: formatMoneyValue(row.signed_amount),
      affects_investment: row.affects_investment ? "Yes" : "No",
      affects_cash_snapshot: row.affects_cash_snapshot ? "Yes" : "No",
      linked_account: row.linked_account,
      description: row.description,
      week_label: row.week_label,
      calculation_state: row.calculation_state,
      actions: "Actions",
    }));
    return filterTrackerRows(tableRows, cashAdjustmentTableColumns, query);
  }, [filteredSourceRows, query]);

  const pageCount = getTrackerPageCount(filteredRows.length, pageSize);
  const effectivePage = Math.min(currentPage, pageCount);
  const pagedRows = useMemo(
    () => paginateTrackerRows(filteredRows, effectivePage, pageSize),
    [effectivePage, filteredRows, pageSize]
  );
  const signedAmountPreview = useMemo(
    () => getSignedAmountPreview(formState.direction, formState.amount),
    [formState.amount, formState.direction]
  );
  const signedAmountNumericPreview = useMemo(
    () => getSignedAmountNumericPreview(formState.direction, formState.amount),
    [formState.amount, formState.direction]
  );
  const scopePreview = useMemo(
    () => getAdjustmentScopeLabel(formState.affects_investment, formState.affects_cash_snapshot),
    [formState.affects_cash_snapshot, formState.affects_investment]
  );
  const missingAdjustmentFields = useMemo(
    () => getMissingRequiredFields(formState),
    [formState]
  );
  const adjustmentValidationActive = showAdjustmentValidation;
  const hasInvalidAdjustmentCombination = useMemo(
    () => hasInvalidDirectionTypeCombination(formState),
    [formState]
  );
  const adjustmentRuleItems = useMemo(() => {
    const items = [
      "Deposit and TopUp stay with In.",
      "Withdrawal, Deduction, and Subscription stay with Out.",
    ];

    if (hasInvalidAdjustmentCombination) {
      items.unshift("Current direction and type do not match the workbook-safe combination.");
    }

    return items;
  }, [hasInvalidAdjustmentCombination]);
  const cashAdjustmentEditorTabs = useMemo<LedgerEditorTabDefinition[]>(() => {
    const detailsIssueCount =
      missingAdjustmentFields.length + (hasInvalidAdjustmentCombination ? 1 : 0);
    const scopeComplete =
      Boolean(formState.linked_account.trim()) ||
      formState.affects_cash_snapshot ||
      formState.affects_investment;
    const notesComplete = Boolean(formState.description.trim());
    const advancedWarningCount = selectedRow?.calculation_notes.length ? 1 : 0;

    return [
      {
        id: "details",
        label: "Details",
        status: detailsIssueCount > 0 && adjustmentValidationActive ? "invalid" : detailsIssueCount === 0 ? "complete" : "neutral",
        requiredIssueCount: detailsIssueCount,
      },
      {
        id: "scope",
        label: "Scope",
        status: scopeComplete ? "complete" : "neutral",
      },
      {
        id: "notes",
        label: "Notes",
        status: notesComplete ? "complete" : "neutral",
      },
      {
        id: "advanced",
        label: "Advanced",
        status: advancedWarningCount > 0 ? "warning" : "neutral",
        warningIssueCount: advancedWarningCount,
      },
    ];
  }, [
    adjustmentValidationActive,
    formState.affects_cash_snapshot,
    formState.affects_investment,
    formState.description,
    formState.linked_account,
    hasInvalidAdjustmentCombination,
    missingAdjustmentFields.length,
    selectedRow?.calculation_notes.length,
  ]);
  const safeActiveEditorTabId = useMemo<CashAdjustmentEditorTabId>(() => {
    const activeTab = cashAdjustmentEditorTabs.find((tab) => tab.id === activeEditorTabId);
    if (activeTab && activeTab.status !== "locked") return activeTab.id as CashAdjustmentEditorTabId;
    return "details";
  }, [activeEditorTabId, cashAdjustmentEditorTabs]);
  const navigableCashAdjustmentTabs = useMemo(
    () => cashAdjustmentEditorTabs.filter((tab) => tab.status !== "locked"),
    [cashAdjustmentEditorTabs]
  );
  const currentCashAdjustmentTabIndex = Math.max(
    0,
    navigableCashAdjustmentTabs.findIndex((tab) => tab.id === safeActiveEditorTabId)
  );
  const previousCashAdjustmentTab =
    currentCashAdjustmentTabIndex > 0
      ? navigableCashAdjustmentTabs[currentCashAdjustmentTabIndex - 1]
      : null;
  const nextCashAdjustmentTab =
    currentCashAdjustmentTabIndex >= 0 &&
    currentCashAdjustmentTabIndex < navigableCashAdjustmentTabs.length - 1
      ? navigableCashAdjustmentTabs[currentCashAdjustmentTabIndex + 1]
      : null;

  const activateCashAdjustmentEditorTab = useCallback((tabId: string) => {
    const targetTab = cashAdjustmentEditorTabs.find((tab) => tab.id === tabId);
    if (!targetTab || targetTab.status === "locked") return;
    setActiveEditorTabId(targetTab.id as CashAdjustmentEditorTabId);
  }, [cashAdjustmentEditorTabs]);

  const guidedEntry = useMemo(
    () => getCashAdjustmentGuidedEntry(formState),
    [formState]
  );
  const cashGuidedFallbackMessages = useMemo<Record<CashAdjustmentGuidedFieldKey, string>>(
    () => ({
      adjustment_date: "Choose The Adjustment Date.",
      adjustment_type: "Choose The Adjustment Type.",
      amount: "Enter The Amount.",
      direction: "Choose The Direction.",
      linked_account: "Choose The Linked Account.",
      scope: "Choose The Reporting Scope.",
    }),
    []
  );
  const safeGuidedEntry = useMemo(() => {
    if (guidedEntry.state === "complete") {
      return guidedEntry;
    }
    const nextRequiredField = guidedEntry.nextRequiredField ?? "adjustment_type";
    return {
      ...guidedEntry,
      nextRequiredField,
      message:
        guidedEntry.message.trim() ||
        cashGuidedFallbackMessages[nextRequiredField] ||
        "Continue The Guided Workflow.",
    };
  }, [cashGuidedFallbackMessages, guidedEntry]);
  const guidedEntryVisible =
    workflowVisible && guidedAccessEnabled && !guidedEntryDismissed && safeGuidedEntry.state !== "complete";
  const guidedEntryMessageId = "cash-adjustment-guided-entry-message";
  const guidedEntryTargetTabId = safeGuidedEntry.nextRequiredField
    ? cashAdjustmentGuidedFieldTabMap[safeGuidedEntry.nextRequiredField]
    : null;
  const guidedEntryNeedsTabJump =
    guidedEntryTargetTabId !== null && guidedEntryTargetTabId !== safeActiveEditorTabId;
  const guidedEntryTargetTabIndex = guidedEntryTargetTabId
    ? cashAdjustmentEditorTabs.findIndex((tab) => tab.id === guidedEntryTargetTabId)
    : -1;
  const guidedEntryTargetTabLabel = guidedEntryTargetTabId
    ? cashAdjustmentGuidedTabLabels[guidedEntryTargetTabId]
    : "";
  const guidedEntryMessageText =
    safeGuidedEntry.message.trim() ||
    (safeGuidedEntry.nextRequiredField
      ? cashGuidedFallbackMessages[safeGuidedEntry.nextRequiredField]
      : "Continue The Guided Workflow.");
  const guidedEntryActionMessage = guidedEntryNeedsTabJump
    ? `Go to ${guidedEntryTargetTabLabel} and ${guidedEntryMessageText}`
    : guidedEntryMessageText;
  const getGuidedFieldClass = useCallback(
    (field: CashAdjustmentGuidedFieldKey, extraClass = "") => {
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
    (field: CashAdjustmentGuidedFieldKey) => ({
      "data-guided-field": field,
    }),
    []
  );
  const getGuidedDescribedBy = useCallback(
    (field: CashAdjustmentGuidedFieldKey) =>
      guidedEntryVisible && safeGuidedEntry.nextRequiredField === field ? guidedEntryMessageId : undefined,
    [guidedEntryMessageId, guidedEntryVisible, safeGuidedEntry.nextRequiredField]
  );
  const focusGuidedEntryTarget = useCallback(() => {
    const nextField = safeGuidedEntry.nextRequiredField;
    if (!nextField) return;
    const nextTab = cashAdjustmentGuidedFieldTabMap[nextField];
    activateCashAdjustmentEditorTab(nextTab);
    window.setTimeout(() => {
      const target = editorRef.current?.querySelector<HTMLElement>(
        `[data-guided-field="${nextField}"]`
      );
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusTarget = target?.matches("input, select, textarea, button")
        ? target
        : target?.querySelector<HTMLElement>("input, select, textarea, button");
      focusTarget?.focus({ preventScroll: true });
    }, 80);
  }, [activateCashAdjustmentEditorTab, safeGuidedEntry.nextRequiredField]);
  const renderGuidedEntryMessage = useCallback((message: string) => {
    const safeMessage = message.trim() || "Continue The Guided Workflow.";
    const targetTerms = [
      "Adjustment Date",
      "Amount",
      "Adjustment Type",
      "Direction",
      "Linked Account",
      "Reporting Scope",
      "Scope",
      "Details",
    ];
    const pattern = new RegExp(`(${targetTerms.join("|")})`, "gi");
    const parts = safeMessage.split(pattern).filter(Boolean);
    if (parts.length === 0) {
      return <>{safeMessage}</>;
    }
    return parts.map((part, index) => {
      if (!part) return null;
      const isTarget = targetTerms.some((term) => term.toLowerCase() === part.toLowerCase());
      if (!isTarget) {
        return part;
      }
      return (
        <span className="guided-entry-token guided-entry-token-field" key={`${part}-${index}`}>
          {part}
        </span>
      );
    });
  }, []);
  const renderGuidedEntryInstruction = useCallback(() => {
    if (!guidedEntryNeedsTabJump) {
      return (
        <span className="guided-entry-instruction-text">
          {renderGuidedEntryMessage(guidedEntryMessageText)}
        </span>
      );
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
        {renderGuidedEntryMessage(guidedEntryMessageText)}
      </span>
    );
  }, [
    guidedEntryMessageText,
    guidedEntryNeedsTabJump,
    guidedEntryTargetTabIndex,
    guidedEntryTargetTabLabel,
    renderGuidedEntryMessage,
  ]);

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
    const rangeRows = rows.filter((row) =>
      isDateWithinResolvedRange(parseDateValue(row.adjustment_date), resolvedDateRange)
    );
    const withdrawals = rangeRows.filter((row) => row.adjustment_type === "Withdrawal");
    const costs = rangeRows.filter((row) => costAdjustmentTypes.has(row.adjustment_type));
    const investmentRows = rangeRows.filter((row) => row.affects_investment);
    const cashSnapshotRows = rangeRows.filter((row) => row.affects_cash_snapshot);

    const signedTotal = rangeRows.reduce((sum, row) => {
      const parsed = Number((row.signed_amount ?? "").replace(/,/g, "").trim());
      return sum + (Number.isFinite(parsed) ? parsed : 0);
    }, 0);

    return {
      withdrawalCount: withdrawals.length,
      withdrawalTotal: withdrawals.reduce((sum, row) => {
        const parsed = Number((row.signed_amount ?? "").replace(/,/g, "").trim());
        return sum + (Number.isFinite(parsed) ? parsed : 0);
      }, 0),
      costCount: costs.length,
      costTotal: costs.reduce((sum, row) => {
        const parsed = Number((row.signed_amount ?? "").replace(/,/g, "").trim());
        return sum + (Number.isFinite(parsed) ? parsed : 0);
      }, 0),
      investmentCount: investmentRows.length,
      cashSnapshotCount: cashSnapshotRows.length,
      signedTotal,
    };
  }, [resolvedDateRange, rows]);
  const quickViewRangeContext = formatResolvedDateRange(resolvedDateRange);
  const quickViewRangeDetail = formatResolvedDateRangeContext(resolvedDateRange);

  async function selectRow(rowId: string, options?: { collapseTable?: boolean }) {
    if (rowId !== selectedId && isDirty && !(await confirmDiscardChanges())) {
      return;
    }
    const record = rows.find((entry) => entry.cash_adjustment_id === rowId);
    if (!record) {
      return;
    }
    if (lockedFeeWithdrawalTypes.has(record.adjustment_type)) {
      setStatusMessage(
        "Confirmed fee withdrawals are read-only here. Use the monthly fee review correction workflow to make a change."
      );
      return;
    }
    setSelectedId(rowId);
    isCreatingDraftRef.current = false;
    const nextFormState = recordToForm(record);
    setFormState(nextFormState);
    setPristineFormState(nextFormState);
    setWorkflowVisible(true);
    setErrorMessage("");
    setShowAdjustmentValidation(false);
    setGuidedEntryDismissed(false);
    setResolvedEditEnabled(false);
    setActiveEditorTabId("details");
    setTableCollapsed(Boolean(options?.collapseTable));
    revealEditor({ expandLedger: !options?.collapseTable });
    setStatusMessage("");
  }

  async function startNewRow() {
    if (isDirty && !(await confirmDiscardChanges())) {
      return;
    }
    setSelectedId(null);
    selectedIdRef.current = null;
    isCreatingDraftRef.current = true;
    setWorkflowVisible(true);
    setTableCollapsed(false);
    const blankForm = createBlankForm();
    setFormState(blankForm);
    setPristineFormState(blankForm);
    setErrorMessage("");
    setShowAdjustmentValidation(false);
    setGuidedEntryDismissed(false);
    setResolvedEditEnabled(false);
    setActiveEditorTabId("details");
    revealEditor({ expandLedger: true });
    setStatusMessage("");
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
    isCreatingDraftRef.current = false;
    setResolvedEditEnabled(false);
    setTableCollapsed(false);
    setStatusMessage("");
  }

  function canPersistForm(nextFormState: CashAdjustmentFormState): boolean {
    return (
      getMissingRequiredFields(nextFormState).length === 0 &&
      !hasInvalidDirectionTypeCombination(nextFormState)
    );
  }

  async function persistForm(
    nextFormState: CashAdjustmentFormState,
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
    if (!canPersistForm(nextFormState)) {
      setShowAdjustmentValidation(true);
      if (!options?.suppressMissingRequiredMessage) {
        const missing = getMissingRequiredFields(nextFormState);
        if (missing.length > 0) {
          setStatusMessage(
            `Complete required cash-adjustment fields before saving: ${missing.join(", ")}.`
          );
        } else {
          setStatusMessage(
            "Direction and adjustment type do not match the workbook-safe combination."
          );
        }
      }
      return false;
    }

    isPersistingRef.current = true;
    setIsPersisting(true);

    try {
      const activeRowId = nextFormState.cash_adjustment_id ?? selectedId;
      const isEditing = Boolean(activeRowId);
      const url = isEditing
        ? `${apiBaseUrl}/profiles/${profileId}/cash-adjustments/${activeRowId}`
        : `${apiBaseUrl}/profiles/${profileId}/cash-adjustments`;
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextFormState),
      });

      if (!response.ok) {
        setErrorMessage(await response.text());
        return false;
      }

      const saved = (await response.json()) as CashAdjustmentRecord;
      const savedFormState = recordToForm(saved);
      invalidateCachedJson(`${apiBaseUrl}/profiles/${profileId}/cash-adjustments`);
      dispatchTrackerDataUpdated({ ledger: "cash-adjustments", profileId });
      const returnToLedger = options?.returnToLedgerOnSuccess ?? !options?.autosaveLabel;
      setFormState(savedFormState);
      setPristineFormState(savedFormState);
      setResolvedEditEnabled(false);
      await loadRows(returnToLedger ? null : saved.cash_adjustment_id);
      setShowAdjustmentValidation(false);
      if (returnToLedger) {
        const blankFormState = createBlankForm();
        setSelectedId(null);
        selectedIdRef.current = null;
        setFormState(blankFormState);
        setPristineFormState(blankFormState);
        setWorkflowVisible(false);
        setTableCollapsed(false);
        setStatusMessage("");
      } else if (!workflowVisible) {
        setStatusMessage(
          options?.autosaveLabel
            ? `${options.autosaveLabel} autosaved for ${saved.cash_adjustment_id}.`
            : isEditing
              ? `Updated cash adjustment ${saved.cash_adjustment_id}.`
              : `Created cash adjustment ${saved.cash_adjustment_id}.`
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await persistForm(formState);
  }

  async function applyDropdownChange(
    updater: (current: CashAdjustmentFormState) => CashAdjustmentFormState,
    autosaveLabel: string
  ) {
    const nextFormState = updater(formState);
    setFormState(nextFormState);
    if (!(selectedId ?? formState.cash_adjustment_id)) {
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
    if (isPersistingRef.current) {
      return;
    }
    if (selectedRow) {
      const nextFormState = recordToForm(selectedRow);
      setFormState(nextFormState);
      setPristineFormState(nextFormState);
      setErrorMessage("");
      setShowAdjustmentValidation(false);
      setGuidedEntryDismissed(false);
      setResolvedEditEnabled(false);
      setSettledDeleteGuardRowId(null);
      setSettledDeleteReason("");
      setActiveEditorTabId("details");
      setStatusMessage(
        `Reverted unsaved changes for cash adjustment ${selectedRow.cash_adjustment_id}.`
      );
      return;
    }

    const blankForm = createBlankForm();
    setFormState(blankForm);
    setPristineFormState(blankForm);
    setErrorMessage("");
    setShowAdjustmentValidation(false);
    setGuidedEntryDismissed(false);
    setResolvedEditEnabled(false);
    setSettledDeleteGuardRowId(null);
    setSettledDeleteReason("");
    setActiveEditorTabId("details");
    setStatusMessage("Cleared the unsaved cash-adjustment draft.");
  }

  async function handleDeleteSelectedRow(
    rowId = selectedId,
    options?: { confirmedSettledReason?: string }
  ) {
    if (!rowId) {
      return;
    }

    const rowForDelete =
      selectedRow?.cash_adjustment_id === rowId
        ? selectedRow
        : rows.find((row) => row.cash_adjustment_id === rowId);
    const isResolvedDelete = rowForDelete?.calculation_state?.toLowerCase() === "resolved";
    const settledReason = options?.confirmedSettledReason?.trim() ?? "";

    if (isResolvedDelete && !settledReason) {
      setSettledDeleteGuardRowId(rowId);
      setSettledDeleteReason("");
      setErrorMessage("");
      return;
    }

    if (!isResolvedDelete) {
      const confirmed = await confirmDestructiveAction({
        confirmLabel: "Delete Row",
        message: `Delete cash-adjustment row ${rowId}? This will remove it from this profile tracker.`,
        title: "Delete cash-adjustment row?",
      });
      if (!confirmed) {
        return;
      }
    }

    setErrorMessage("");
    const response = await fetch(
      `${apiBaseUrl}/profiles/${profileId}/cash-adjustments/${rowId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      setErrorMessage((await response.text()) || "Unable to delete cash-adjustment row");
      return;
    }

    invalidateCachedJson(`${apiBaseUrl}/profiles/${profileId}/cash-adjustments`);
    dispatchTrackerDataUpdated({ ledger: "cash-adjustments", profileId });
    await loadRows(null);
    if (selectedId === rowId) setWorkflowVisible(false);
    setStatusMessage(`Deleted cash adjustment ${rowId}.`);
  }

  function handleCancelResolvedEdit() {
    if (!selectedRow) {
      setResolvedEditEnabled(false);
      return;
    }

    const nextFormState = recordToForm(selectedRow);
    setFormState(nextFormState);
    setPristineFormState(nextFormState);
    setResolvedEditEnabled(false);
    setErrorMessage("");
    setShowAdjustmentValidation(false);
    setGuidedEntryDismissed(false);
    setSettledDeleteGuardRowId(null);
    setSettledDeleteReason("");
    setStatusMessage(`Restored cash adjustment ${selectedRow.cash_adjustment_id}.`);
  }

  function renderTableCell(row: TrackerRow, column: TableColumn) {
    const rowId = String(row.cash_adjustment_id ?? "");
    const sourceRow = cashAdjustmentRowsById.get(rowId);
    const value = String(row[column.key] ?? "").trim() || "—";

    if (
      column.key === "direction" ||
      column.key === "adjustment_type" ||
      column.key === "affects_investment" ||
      column.key === "affects_cash_snapshot" ||
      column.key === "calculation_state"
    ) {
      return <span className="table-chip">{value}</span>;
    }

    if ((column.key === "amount" || column.key === "signed_amount") && sourceRow) {
      const numericValue = Number(String(sourceRow[column.key] ?? "").replace(/,/g, ""));
      return Number.isFinite(numericValue)
        ? <FinancialValue className="ledger-financial-value" value={numericValue} />
        : <span className="table-cell-text">{value}</span>;
    }

    if (column.key === "actions" && sourceRow) {
      return (
        <div
          className="table-action-row"
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <button
            aria-label={`Edit ${sourceRow.cash_adjustment_id}`}
            className="icon-button table-action-button"
            disabled={lockedFeeWithdrawalTypes.has(sourceRow.adjustment_type)}
            onClick={() => void selectRow(sourceRow.cash_adjustment_id)}
            title={
              lockedFeeWithdrawalTypes.has(sourceRow.adjustment_type)
                ? "Confirmed fee withdrawals are managed from monthly fee review"
                : `Edit ${sourceRow.cash_adjustment_id}`
            }
            type="button"
          >
            <span aria-hidden="true">✎</span>
          </button>
          <button
            aria-label={`Delete cash-adjustment row ${sourceRow.cash_adjustment_id}`}
            className="icon-button icon-button-destructive table-action-button"
            disabled={lockedFeeWithdrawalTypes.has(sourceRow.adjustment_type)}
            onClick={() => void handleDeleteSelectedRow(sourceRow.cash_adjustment_id)}
            title={
              lockedFeeWithdrawalTypes.has(sourceRow.adjustment_type)
                ? "Confirmed fee withdrawals cannot be deleted directly"
                : `Delete ${sourceRow.cash_adjustment_id}`
            }
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined">delete</span>
          </button>
        </div>
      );
    }

    return <span className="table-cell-text">{value}</span>;
  }

  return (
    <section className="stack">
      {!workflowVisible ? (
        <StatusToast message={statusMessage} onDismiss={clearStatusMessage} />
      ) : null}
      <section
        aria-busy={isInitialLoading}
        className="content-panel stack sportsbook-page-shell"
      >
        <div className="sportsbook-page-header">
          <h1 className="sportsbook-page-title">Cash Adjustments</h1>
        </div>
        {isInitialLoading ? (
          <LedgerLoadingIndicator label="Loading cash-adjustment ledger" />
        ) : null}
        <section className="stat-strip" aria-label="Cash-adjustment quick view">
          <TrackerRangeCard
            activePreset={trackerSettings?.active_date_preset ?? "Week (Mon-Sun)"}
            isSaving={isTrackerRangeSaving}
            onPresetChange={(preset) => void updateTrackerDatePreset(preset)}
            rangeDetail={quickViewRangeDetail}
            rangeContext={quickViewRangeContext}
          />
          <article className="stat-card">
            <span className="eyebrow">Withdrawals</span>
            <strong>{quickView.withdrawalCount}</strong>
            <span><FinancialValue value={quickView.withdrawalTotal} /></span>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Costs</span>
            <strong>{quickView.costCount}</strong>
            <span><FinancialValue value={quickView.costTotal} /></span>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Cash impact</span>
            <strong>
              {quickView.investmentCount} / {quickView.cashSnapshotCount}
            </strong>
            <span>Investment rows • Account-cash rows</span>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Cash Adjustment Net</span>
            <strong><FinancialValue value={quickView.signedTotal} /></strong>
            <span>Selected-range cash movement</span>
          </article>
        </section>
        <div className="sportsbook-review-bar" aria-label="Cash-adjustment ledger controls" role="toolbar">
          <label className="field-control table-search-field"><span className="visually-hidden">Search cash-adjustment rows</span><input aria-label="Search cash-adjustment rows" onChange={(event) => { setQuery(event.target.value); setCurrentPage(1); }} placeholder="Search cash-adjustment rows" type="search" value={query} /></label>
          <LedgerAddRowButton label="Add cash adjustment" onClick={() => void startNewRow()} />
          <div className="table-filter-button-wrap">
            <button aria-label="Open cash-adjustment filter and column controls" className={`icon-button table-filter-button${hasActiveTableControls ? " has-active-table-controls" : ""}`} onClick={() => setIsFilterModalOpen(true)} title="Filter and columns" type="button"><svg aria-hidden="true" className="table-filter-icon" fill="none" viewBox="0 0 24 24"><path d="M4 6h16l-6.5 7.3v4.9l-3 1.8v-6.7L4 6Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>{hasActiveTableControls ? <span aria-label={`${activeTableControlCount} active table controls`} className="table-filter-badge">{activeTableControlCount > 9 ? "9+" : activeTableControlCount}</span> : null}</button>
            {hasActiveTableControls ? <button aria-label="Clear active cash-adjustment filters and hidden-column states" className="table-filter-clear" onClick={() => { clearTableFilters(); setVisibleColumnKeys(new Set(defaultVisibleCashAdjustmentColumns)); }} type="button">×</button> : null}
          </div>
        </div>
        {!tableCollapsed ? (
          <>
            {errorMessage ? (
              <p className="error-text" role="alert">
                {errorMessage}
              </p>
            ) : null}
            <LedgerPagination
              ariaLabel="Cash Adjustment pagination"
              currentPage={effectivePage}
              onPageChange={setCurrentPage}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize);
                setCurrentPage(1);
              }}
              pageCount={pageCount}
              pageSize={pageSize}
              position="top"
              totalRows={filteredRows.length}
            />
            <LedgerTableScroll dataPdId="cash-adjustments.table-scroll">
              <table className="data-table sportsbook-data-table">
                <colgroup>
                  {tableColumns.map((column) => {
                    const key = column.key as CashAdjustmentColumnKey;
                    const width = columnWidths[key] ?? defaultCashAdjustmentColumnWidths[key];
                    return <col key={column.key} style={{ width: `${width}px` }} />;
                  })}
                </colgroup>
                <thead>
                  <tr>
                    {tableColumns.map((column) => {
                      const sortable = isSortableCashAdjustmentColumn(column.key);
                      const sortableKey = sortable ? (column.key as CashAdjustmentSortKey) : null;
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
                                  column.key as CashAdjustmentColumnKey,
                                  headerCell,
                                  tableElement
                                );
                              }}
                              onMouseDown={(event) => {
                                const headerCell = event.currentTarget.closest("th");
                                startColumnResize(
                                  event,
                                  column.key as CashAdjustmentColumnKey,
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
                        No cash-adjustment rows match the current filter.
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((row, index) => {
                      const rowId = String(row.cash_adjustment_id);
                      const sourceRow = cashAdjustmentRowsById.get(rowId);
                      const rowIssueBadges = sourceRow
                        ? sortIssueBadgesByPriority(getCashAdjustmentIssueBadges(sourceRow))
                        : [];
                      return (
                        <tr
                          className={[
                            selectedId === rowId ? "is-selected-row" : "",
                            rowIssueBadges.length > 0 ? "row-state-issue-warning" : "",
                          ]
                            .filter(Boolean)
                            .join(" ") || undefined}
                          key={`${rowId}-${index}`}
                          onClick={() => void selectRow(rowId)}
                          onDoubleClick={() => void selectRow(rowId, { collapseTable: true })}
                        >
                          {tableColumns.map((column) => (
                            <td className="align-center" key={column.key}>
                              {column.key === "adjustment_date" && rowIssueBadges.length > 0 ? (
                                <div className="row-issue-overlay" aria-hidden="true">
                                  {rowIssueBadges.map((badge) => (
                                    <span className="table-chip table-chip-lay-partial" key={badge.label}>
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
            </LedgerTableScroll>
            <LedgerPagination
              ariaLabel="Cash Adjustment pagination"
              currentPage={effectivePage}
              onPageChange={setCurrentPage}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize);
                setCurrentPage(1);
              }}
              pageCount={pageCount}
              pageSize={pageSize}
              position="bottom"
              totalRows={filteredRows.length}
            />
          </>
        ) : null}
      </section>
      {isFilterModalOpen ? (
        <div className="modal-backdrop" onClick={() => setIsFilterModalOpen(false)}>
          <section
            aria-label="Cash-adjustment filter controls"
            aria-modal="true"
            className="modal-panel stack"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="workflow-panel-header">
              <div className="stack">
                <span className="eyebrow">Table controls</span>
                <strong>Filter cash-adjustment rows</strong>
              </div>
              <button
                aria-label="Close cash-adjustment filter controls"
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
                  aria-label="Cash-adjustment review mode"
                  onChange={(event) => {
                    setTableMode(event.target.value as CashAdjustmentTableMode);
                    setCurrentPage(1);
                  }}
                  value={tableMode}
                >
                  {cashAdjustmentTableModes.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Direction</span>
                <select
                  onChange={(event) => updateTableFilter("direction", event.target.value)}
                  value={tableFilters.direction}
                >
                  <option value="">All</option>
                  {cashAdjustmentFilterOptions.directions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Type</span>
                <select
                  onChange={(event) => updateTableFilter("adjustment_type", event.target.value)}
                  value={tableFilters.adjustment_type}
                >
                  <option value="">All</option>
                  {cashAdjustmentFilterOptions.adjustmentTypes.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Investment</span>
                <select
                  onChange={(event) => updateTableFilter("affects_investment", event.target.value)}
                  value={tableFilters.affects_investment}
                >
                  <option value="">All</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </label>
              <label className="field-control">
                <span>Cash snapshot</span>
                <select
                  onChange={(event) => updateTableFilter("affects_cash_snapshot", event.target.value)}
                  value={tableFilters.affects_cash_snapshot}
                >
                  <option value="">All</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </label>
              <label className="field-control">
                <span>Calc state</span>
                <select
                  onChange={(event) => updateTableFilter("calculation_state", event.target.value)}
                  value={tableFilters.calculation_state}
                >
                  <option value="">All</option>
                  {cashAdjustmentFilterOptions.calculationStates.map((option) => (
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
                    updateTableFilter("issue_type", event.target.value as CashAdjustmentIssueFilter)
                  }
                  value={tableFilters.issue_type}
                >
                  <option value="any">All</option>
                  <option value="no-account">No Account</option>
                  <option value="no-scope">No Scope</option>
                </select>
              </label>
              <label className="field-control">
                <span>Signed min</span>
                <input
                  inputMode="decimal"
                  onChange={(event) => updateTableFilter("min_value", event.target.value)}
                  placeholder="0"
                  value={tableFilters.min_value}
                />
              </label>
              <label className="field-control">
                <span>Signed max</span>
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
                {cashAdjustmentTableColumns.map((column) => {
                  const key = column.key as CashAdjustmentColumnKey;
                  const hideable = hideableCashAdjustmentColumnKeys.has(key);
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
                  setVisibleColumnKeys(new Set(defaultVisibleCashAdjustmentColumns));
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

      {workflowVisible ? (
        <div className="modal-backdrop" onClick={() => void closeEditor()}>
      <section
        aria-label={selectedId ? "Edit cash adjustment" : "Create cash adjustment"}
        aria-busy={isPersisting}
        aria-modal="true"
        className="content-panel stack workflow-editor-panel modal-panel workflow-editor-modal"
        data-pd-id="cash-adjustments.editor.dialog"
        onClick={(event) => event.stopPropagation()}
        ref={editorRef}
        role="dialog"
      >
          <div className="workflow-panel-header workflow-editor-header" data-pd-id="cash-adjustments.editor.header">
            <div className="stack workflow-editor-title-stack">
            <span className="eyebrow">{selectedId ? "Edit cash adjustment" : "Create cash adjustment"}</span>
            <strong>{selectedId ?? "New cash adjustment"}</strong>
            </div>
            <section
              aria-label="Cash-adjustment editor context"
              className="editor-compact-summary"
              data-pd-id="cash-adjustments.editor.compact-summary"
            >
              <span
                className="table-chip editor-summary-value-chip"
                title={`Signed preview: ${signedAmountPreview}`}
              >
                {signedAmountNumericPreview === null ? (
                  <span className="ledger-financial-value ledger-financial-value-unavailable">
                    £ -
                  </span>
                ) : (
                  <FinancialValue
                    animate={false}
                    className="ledger-financial-value editor-summary-financial-value"
                    label="Signed preview"
                    value={signedAmountNumericPreview}
                  />
                )}
              </span>
              <span className="table-chip">{formState.adjustment_type || "Type pending"}</span>
              <span
                className={`table-chip${
                  formState.direction === "In" ? " table-chip-lay-full" : " table-chip-danger"
                }`}
              >
                {formState.direction || "Out"}
              </span>
              <span className="table-chip table-chip-muted">{scopePreview}</span>
              <span className="table-chip table-chip-muted">
                {selectedRow?.calculation_state || "Draft"}
              </span>
            </section>
            <div
              className="tracker-nav workflow-editor-header-actions"
              data-pd-id="cash-adjustments.editor.tab-actions"
            >
              <div
                aria-label="Cash-adjustment editor tab navigation"
                className="workflow-editor-header-nav"
                role="group"
              >
                <button
                  className="review-chip review-chip-action-previous"
                  disabled={!previousCashAdjustmentTab}
                  onClick={() => {
                    if (previousCashAdjustmentTab) {
                      activateCashAdjustmentEditorTab(previousCashAdjustmentTab.id);
                    }
                  }}
                  type="button"
                >
                  Previous
                </button>
                <button
                  className="review-chip review-chip-action-next"
                  disabled={!nextCashAdjustmentTab}
                  onClick={() => {
                    if (nextCashAdjustmentTab) {
                      activateCashAdjustmentEditorTab(nextCashAdjustmentTab.id);
                    }
                  }}
                  type="button"
                >
                  Next
                </button>
              </div>
              <button
                aria-label="Close cash-adjustment editor"
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
              ariaLabel="Cash-adjustment editor steps"
              guidedTargetTabId={guidedEntryVisible ? guidedEntryTargetTabId : null}
              onActiveTabChange={activateCashAdjustmentEditorTab}
              tabs={cashAdjustmentEditorTabs}
            />
        </div>
        {guidedEntryVisible ? (
          <section
            aria-label="Cash-adjustment guided entry"
            className={`guided-entry-banner guided-entry-banner-${safeGuidedEntry.state}`}
            data-pd-id="cash-adjustments.guided-entry"
            key={`${safeGuidedEntry.state}:${safeGuidedEntry.nextRequiredField ?? "none"}:${guidedEntryActionMessage}`}
            role="status"
          >
            <button className="guided-entry-action" onClick={focusGuidedEntryTarget} type="button">
              <span className="eyebrow">
                {safeGuidedEntry.state === "review_required" ? "Review required" : "Next required"}
              </span>
              <strong id={guidedEntryMessageId}>
                {renderGuidedEntryInstruction()}
              </strong>
            </button>
            <button
              aria-label="Dismiss cash-adjustment guided entry"
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
            data-pd-id="cash-adjustments.guided-entry.restore"
            onClick={() => setGuidedEntryDismissed(false)}
            type="button"
          >
            Show guide
          </button>
        ) : null}
          <div className="workflow-editor-body">
            <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
          <LedgerEditorTabPanel activeTabId={safeActiveEditorTabId} tabId="details">
          <EditorSection
            invalid={
              adjustmentValidationActive &&
              (missingAdjustmentFields.length > 0 || hasInvalidAdjustmentCombination)
            }
            title="Adjustment setup"
          >
            <fieldset className="section-fieldset" disabled={isResolvedReadOnly}>
            {adjustmentValidationActive && missingAdjustmentFields.length > 0 ? (
              <EditorValidationBanner
                dismissKey={`cash-adjustment-setup:${selectedId ?? formState.cash_adjustment_id ?? "new"}:${missingAdjustmentFields.join("|")}`}
                id="cash-adjustment.editor.setup-validation"
                message={`Complete these fields before saving: ${missingAdjustmentFields.join(", ")}.`}
                title="Adjustment setup incomplete"
              />
            ) : null}
            {adjustmentValidationActive && hasInvalidAdjustmentCombination ? (
              <EditorValidationBanner
                dismissKey={`cash-adjustment-combination:${selectedId ?? formState.cash_adjustment_id ?? "new"}:${formState.direction}:${formState.adjustment_type}`}
                id="cash-adjustment.editor.combination-validation"
                message="Direction and adjustment type must stay in a workbook-safe combination."
                title="Workbook-safe combination required"
              />
            ) : null}
            <div className="form-grid">
              <label
                className={`${getGuidedFieldClass("adjustment_date")}${
                  adjustmentValidationActive && !formState.adjustment_date.trim() ? " is-invalid" : ""
                }`}
                {...getGuidedFieldData("adjustment_date")}
              >
                <span>Adjustment date</span>
                <input
                  aria-describedby={getGuidedDescribedBy("adjustment_date")}
                  aria-invalid={adjustmentValidationActive && !formState.adjustment_date.trim()}
                  lang="en-GB"
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      adjustment_date: event.target.value,
                    }))
                  }
                  required
                  type="datetime-local"
                  value={formState.adjustment_date}
                />
              </label>
              <label
                className={`${getGuidedFieldClass("amount")}${
                  adjustmentValidationActive && !formState.amount.trim() ? " is-invalid" : ""
                }`}
                {...getGuidedFieldData("amount")}
              >
                <span>Amount</span>
                <input
                  aria-describedby={getGuidedDescribedBy("amount")}
                  aria-invalid={adjustmentValidationActive && !formState.amount.trim()}
                  inputMode="decimal"
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, amount: event.target.value }))
                  }
                  required
                  value={formState.amount}
                />
              </label>
              <label
                className={`${getGuidedFieldClass("adjustment_type")}${
                  adjustmentValidationActive && hasInvalidAdjustmentCombination ? " is-invalid" : ""
                }`}
                {...getGuidedFieldData("adjustment_type")}
              >
                <span>Adjustment type</span>
                <select
                  aria-describedby={getGuidedDescribedBy("adjustment_type")}
                  aria-invalid={adjustmentValidationActive && hasInvalidAdjustmentCombination}
                  onChange={(event) =>
                    void applyDropdownChange(
                      (current) => applyAdjustmentTypeDefaults(current, event.target.value),
                      "Adjustment type change"
                    )
                  }
                  value={formState.adjustment_type}
                >
                  {allowedAdjustmentTypes.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className={`${getGuidedFieldClass("direction")}${
                  adjustmentValidationActive && hasInvalidAdjustmentCombination ? " is-invalid" : ""
                }`}
                {...getGuidedFieldData("direction")}
              >
                <span>Direction</span>
                <select
                  aria-describedby={getGuidedDescribedBy("direction")}
                  aria-invalid={adjustmentValidationActive && hasInvalidAdjustmentCombination}
                  onChange={(event) =>
                    void applyDropdownChange(
                      (current) => applyDirectionDefaults(current, event.target.value),
                      "Direction change"
                    )
                  }
                  value={formState.direction}
                >
                  {cashAdjustmentDirectionOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <div className="calculator-rule-row field-span-2" role="list" aria-label="Cash-adjustment rules">
                {adjustmentRuleItems.map((item) => (
                  <span className="calculator-rule-chip" key={item} role="listitem">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            </fieldset>
          </EditorSection>
          </LedgerEditorTabPanel>
          <LedgerEditorTabPanel activeTabId={safeActiveEditorTabId} tabId="scope">
          <EditorSection title="Reporting scope">
            <fieldset className="section-fieldset" disabled={isResolvedReadOnly}>
            <div className="form-grid">
              <label
                className={getGuidedFieldClass("linked_account")}
                {...getGuidedFieldData("linked_account")}
              >
                <span>Linked account</span>
                <select
                  aria-describedby={getGuidedDescribedBy("linked_account")}
                  onChange={(event) =>
                    void applyDropdownChange(
                      (current) => ({ ...current, linked_account: event.target.value }),
                      "Linked account change"
                    )
                  }
                  value={formState.linked_account}
                >
                  <option value="">Select linked account</option>
                  {accountOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className={getGuidedFieldClass("scope")} {...getGuidedFieldData("scope")}>
                <span>Affects investment</span>
                <select
                  aria-describedby={getGuidedDescribedBy("scope")}
                  onChange={(event) =>
                    void applyDropdownChange(
                      (current) => ({
                        ...current,
                        affects_investment: event.target.value === "true",
                      }),
                      "Investment inclusion change"
                    )
                  }
                  value={String(formState.affects_investment)}
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label className={getGuidedFieldClass("scope")} {...getGuidedFieldData("scope")}>
                <span>Affects cash snapshot</span>
                <select
                  aria-describedby={getGuidedDescribedBy("scope")}
                  onChange={(event) =>
                    void applyDropdownChange(
                      (current) => ({
                        ...current,
                        affects_cash_snapshot: event.target.value === "true",
                      }),
                      "Cash snapshot inclusion change"
                    )
                  }
                  value={String(formState.affects_cash_snapshot)}
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label className="field-control">
                <span>Signed value preview</span>
                <input readOnly value={signedAmountPreview} />
              </label>
            </div>
            </fieldset>
          </EditorSection>
          </LedgerEditorTabPanel>
          <LedgerEditorTabPanel activeTabId={safeActiveEditorTabId} tabId="notes">
          <EditorSection title="Audit note">
            <fieldset className="section-fieldset" disabled={isResolvedReadOnly}>
            <label className="field-control">
              <span>Description</span>
              <textarea
                onChange={(event) =>
                  setFormState((current) => ({ ...current, description: event.target.value }))
                }
                rows={5}
                value={formState.description}
              />
            </label>
            </fieldset>
          </EditorSection>
          </LedgerEditorTabPanel>
          <LedgerEditorTabPanel activeTabId={safeActiveEditorTabId} tabId="advanced">
          <EditorSection defaultOpen={false} title="Advanced controls">
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
          </EditorSection>
          </LedgerEditorTabPanel>
              <div className="field-span-2 workflow-editor-footer" data-pd-id="cash-adjustments.editor.actions">
                {selectedId && settledDeleteGuardRowId === selectedId ? (
                  <LedgerSettledDeleteGuard
                    disabled={isPersisting}
                    ledgerLabel="cash-adjustments"
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
                  {isResolvedReadOnly ? (
                    <button
                      aria-label="Edit cash-adjustment row"
                      className="review-chip"
                      disabled={isPersisting}
                      onClick={() => setResolvedEditEnabled(true)}
                      type="button"
                    >
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        className="review-chip review-chip-copy"
                        disabled={isPending || isPersisting || !isDirty}
                        type="submit"
                      >
                        {isPending || isPersisting ? <span aria-hidden="true" className="button-spinner" /> : null}
                        {isPending || isPersisting ? "Saving" : resolvedEditEnabled ? "Save Edits" : "Save"}
                      </button>
                      {resolvedEditEnabled ? (
                        <button
                          className="review-chip"
                          disabled={isPersisting}
                          onClick={handleCancelResolvedEdit}
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
                  className="tracker-nav workflow-editor-footer-nav"
                  data-pd-id="cash-adjustments.editor.footer-tab-actions"
                >
                  <button
                    className="review-chip review-chip-action-previous"
                    disabled={!previousCashAdjustmentTab}
                    onClick={() => {
                      if (previousCashAdjustmentTab) {
                        activateCashAdjustmentEditorTab(previousCashAdjustmentTab.id);
                      }
                    }}
                    type="button"
                  >
                    Previous
                  </button>
                  <button
                    className="review-chip review-chip-action-next"
                    disabled={!nextCashAdjustmentTab}
                    onClick={() => {
                      if (nextCashAdjustmentTab) {
                        activateCashAdjustmentEditorTab(nextCashAdjustmentTab.id);
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
