"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { apiBaseUrl } from "@/lib/api";
import { getAllAccountNames, type AccountAuthorityRecord } from "@/lib/account-authorities";
import { StatusToast } from "@/components/status-toast";
import { EditorSection } from "@/components/editor-section";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import {
  scrollToElementTopAfterRender,
  useDialogFocusLifecycle,
  usePersistedBoolean,
  usePersistedState,
  useToastDismiss,
  useTrackerRouteReselect,
} from "@/lib/ledger-ui";
import type { TableColumn } from "@/lib/tracker-modules";
import { resolveDateRange, type DatePreset } from "@/lib/tracker-summary";
import { filterTrackerRows, getTrackerPageCount, paginateTrackerRows } from "@/lib/tracker-table";
import type { TrackerRow } from "@/lib/tracker-types";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { sortIssueBadgesByPriority } from "@/lib/issue-priority";
import {
  cashAdjustmentDirectionOptions,
  cashAdjustmentTypeOptions,
  dedupeOptions,
} from "@/lib/workbook-options";

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
  created_at: string;
  updated_at: string;
};

type CashAdjustmentTableMode =
  | "recent"
  | "withdrawals"
  | "costs"
  | "investment"
  | "cash-snapshot";

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
const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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

  return currencyFormatter.format(numeric);
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
  return currencyFormatter.format(signedNumeric);
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
  const [rows, setRows] = useState<CashAdjustmentRecord[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [accountAuthorities, setAccountAuthorities] = useState<AccountAuthorityRecord[]>([]);
  const [trackerSettings, setTrackerSettings] = useState<TrackerSettingsRecord | null>(null);
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
  const [showAdjustmentValidation, setShowAdjustmentValidation] = useState(false);
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
      const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/cash-adjustments`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Unable to load cash-adjustment rows");
      }

      const nextRows = (await response.json()) as CashAdjustmentRecord[];
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
            setFormState(nextFormState);
            setPristineFormState(nextFormState);
            setShowAdjustmentValidation(false);
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

  const filteredSourceRows = useMemo(() => {
    return sortedReviewRows.filter((row) => {
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
  }, [sortedReviewRows, tableFilters]);

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
    [effectivePage, filteredRows]
  );
  const signedAmountPreview = useMemo(
    () => getSignedAmountPreview(formState.direction, formState.amount),
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

  function selectRow(rowId: string, options?: { collapseTable?: boolean }) {
    if (rowId !== selectedId && isDirty && !confirmDiscardChanges()) {
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
    setTableCollapsed(Boolean(options?.collapseTable));
    revealEditor({ expandLedger: !options?.collapseTable });
    setStatusMessage(`Opened cash adjustment ${rowId} for editing.`);
  }

  function startNewRow() {
    if (isDirty && !confirmDiscardChanges()) {
      return;
    }
    setSelectedId(null);
    isCreatingDraftRef.current = true;
    setWorkflowVisible(true);
    setTableCollapsed(false);
    const blankForm = createBlankForm();
    setFormState(blankForm);
    setPristineFormState(blankForm);
    setErrorMessage("");
    setShowAdjustmentValidation(false);
    revealEditor({ expandLedger: true });
    setStatusMessage("New cash adjustment ready. Complete the required fields, then save.");
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
  ) {
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
      return;
    }

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
      return;
    }

    const saved = (await response.json()) as CashAdjustmentRecord;
    await loadRows(saved.cash_adjustment_id);
    setShowAdjustmentValidation(false);
    if (options?.returnToLedgerOnSuccess ?? !options?.autosaveLabel) {
      setWorkflowVisible(false);
      setTableCollapsed(false);
    }
    setStatusMessage(
      options?.autosaveLabel
        ? `${options.autosaveLabel} autosaved for ${saved.cash_adjustment_id}.`
        : isEditing
          ? `Updated cash adjustment ${saved.cash_adjustment_id}.`
          : `Created cash adjustment ${saved.cash_adjustment_id}.`
    );
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
    if (selectedRow) {
      const nextFormState = recordToForm(selectedRow);
      setFormState(nextFormState);
      setPristineFormState(nextFormState);
      setErrorMessage("");
      setShowAdjustmentValidation(false);
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
    setStatusMessage("Cleared the unsaved cash-adjustment draft.");
  }

  async function handleDeleteSelectedRow(rowId = selectedId) {
    if (!rowId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete cash-adjustment row ${rowId}? This will remove it from this profile tracker.`
    );
    if (!confirmed) {
      return;
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

    await loadRows(null);
    if (selectedId === rowId) setWorkflowVisible(false);
    setStatusMessage(`Deleted cash adjustment ${rowId}.`);
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
            onClick={() => selectRow(sourceRow.cash_adjustment_id)}
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
      <StatusToast message={statusMessage} onDismiss={clearStatusMessage} />
      <section
        aria-busy={isInitialLoading}
        className="content-panel stack sportsbook-page-shell"
      >
        <div className="sportsbook-page-header">
          <h1 className="sportsbook-page-title">Cash Adjustments</h1>
          <div className="tracker-nav">
            <button className="button-link" onClick={startNewRow} type="button">
              Add cash adjustment
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
          <LedgerLoadingIndicator label="Loading cash-adjustment ledger" />
        ) : null}
        <div className="sportsbook-review-bar" aria-label="Cash-adjustment review controls">
          <label className="field-control table-search-field">
            <span>Search</span>
            <input
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search cash-adjustment rows"
              type="search"
              value={query}
            />
          </label>
          <div className="table-filter-button-wrap">
            <button
              aria-label="Open cash-adjustment filter and column controls"
              className={`icon-button table-filter-button${hasActiveTableControls ? " has-active-table-controls" : ""}`}
              onClick={() => setIsFilterModalOpen(true)}
              title="Filter and columns"
              type="button"
            >
              <svg aria-hidden="true" className="table-filter-icon" fill="none" viewBox="0 0 24 24">
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
                aria-label="Clear active cash-adjustment filters and hidden-column states"
                className="table-filter-clear"
                onClick={() => {
                  clearTableFilters();
                  setVisibleColumnKeys(new Set(defaultVisibleCashAdjustmentColumns));
                }}
                type="button"
              >
                ×
              </button>
            ) : null}
          </div>
        </div>
        <section className="stat-strip" aria-label="Cash-adjustment quick view">
          <article className="stat-card">
            <span className="eyebrow">Withdrawals</span>
            <strong>{quickView.withdrawalCount}</strong>
            <span>{formatMoneyValue(String(quickView.withdrawalTotal))}</span>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Costs</span>
            <strong>{quickView.costCount}</strong>
            <span>{formatMoneyValue(String(quickView.costTotal))}</span>
          </article>
            <article className="stat-card">
              <span className="eyebrow">Workbook scope</span>
              <strong>
                {quickView.investmentCount} / {quickView.cashSnapshotCount}
              </strong>
            <span>Investment rows • Cash-snapshot rows</span>
            </article>
          <article className="stat-card">
            <span className="eyebrow">Signed total</span>
            <strong>{formatMoneyValue(String(quickView.signedTotal))}</strong>
            <span>Current net signed effect</span>
          </article>
        </section>
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
                          onClick={() => selectRow(rowId)}
                          onDoubleClick={() => selectRow(rowId, { collapseTable: true })}
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
            </div>
            <div className="table-pagination" aria-label="Cash-adjustment pagination">
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
        <div className="modal-backdrop" onClick={closeEditor}>
      <section
        aria-label={selectedId ? "Edit cash adjustment" : "Create cash adjustment"}
        aria-modal="true"
        className="content-panel stack workflow-editor-panel modal-panel workflow-editor-modal"
        data-pd-id="cash-adjustments.editor.dialog"
        onClick={(event) => event.stopPropagation()}
        ref={editorRef}
        role="dialog"
      >
          <div className="workflow-panel-header workflow-editor-header" data-pd-id="cash-adjustments.editor.header">
            <div className="stack">
            <span className="eyebrow">{selectedId ? "Edit cash adjustment" : "Create cash adjustment"}</span>
            <strong>{selectedId ?? "New cash adjustment"}</strong>
            </div>
            <div className="tracker-nav">
              <button aria-label="Close cash-adjustment editor" className="button-link" data-initial-focus="" onClick={closeEditor} type="button">
                Close
              </button>
            </div>
        </div>
          <div className="workflow-editor-body">
            <section className="stat-strip" aria-label="Cash-adjustment summary">
              <article className="stat-card">
                <span className="eyebrow">Signed preview</span>
                <strong>{signedAmountPreview}</strong>
                <span>{formState.adjustment_type || "Type pending"} • {formState.direction || "—"}</span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Adjustment date</span>
                <strong>{formState.adjustment_date ? formatUkDateTime(formState.adjustment_date) : "—"}</strong>
                <span>Raw amount: {formatMoneyValue(formState.amount)}</span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Tracker scope</span>
                <strong>{scopePreview}</strong>
                <span>Linked account: {formState.linked_account || "Unassigned"}</span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Workbook state</span>
                <strong>{selectedRow?.calculation_state || "Draft"}</strong>
                <span>{selectedRow?.week_label || "Pending save"}</span>
              </article>
            </section>
            <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
          <EditorSection
            invalid={
              adjustmentValidationActive &&
              (missingAdjustmentFields.length > 0 || hasInvalidAdjustmentCombination)
            }
            title="Adjustment setup"
          >
            {adjustmentValidationActive && missingAdjustmentFields.length > 0 ? (
              <p className="field-validation-text" role="alert">
                Complete the required Adjustment details fields: {missingAdjustmentFields.join(", ")}.
              </p>
            ) : null}
            {adjustmentValidationActive && hasInvalidAdjustmentCombination ? (
              <p className="field-validation-text" role="alert">
                Direction and adjustment type must stay in a workbook-safe combination.
              </p>
            ) : null}
            <div className="form-grid">
              <label
                className={`field-control${
                  adjustmentValidationActive && !formState.adjustment_date.trim() ? " is-invalid" : ""
                }`}
              >
                <span>Adjustment date</span>
                <input
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
                className={`field-control${
                  adjustmentValidationActive && !formState.amount.trim() ? " is-invalid" : ""
                }`}
              >
                <span>Amount</span>
                <input
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
                className={`field-control${
                  adjustmentValidationActive && hasInvalidAdjustmentCombination ? " is-invalid" : ""
                }`}
              >
                <span>Adjustment type</span>
                <select
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
                className={`field-control${
                  adjustmentValidationActive && hasInvalidAdjustmentCombination ? " is-invalid" : ""
                }`}
              >
                <span>Direction</span>
                <select
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
          </EditorSection>
          <EditorSection title="Reporting scope">
            <div className="form-grid">
              <label className="field-control">
                <span>Linked account</span>
                <select
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
              <label className="field-control">
                <span>Affects investment</span>
                <select
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
              <label className="field-control">
                <span>Affects cash snapshot</span>
                <select
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
          </EditorSection>
          <EditorSection title="Audit note">
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
          </EditorSection>
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
              <div className="tracker-nav field-span-2 workflow-editor-footer" data-pd-id="cash-adjustments.editor.actions">
                <button className="review-chip review-chip-copy" disabled={isPending} type="submit">
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
                <button aria-label="Close cash-adjustment editor" className="button-link tracker-nav-right-action" onClick={closeEditor} type="button">
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
