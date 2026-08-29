"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { apiBaseUrl } from "@/lib/api";
import { AccountProviderIdentity } from "@/components/account-provider-identity";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { FinancialValue } from "@/components/financial-value";
import { FinancialTextInput } from "@/components/financial-text-input";
import { LedgerAddRowButton } from "@/components/ledger-add-row-button";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { LedgerPagination } from "@/components/ledger-pagination";
import { LedgerTableScroll } from "@/components/ledger-table-scroll";
import { MaterialDateField, MaterialDateTimeField } from "@/components/material-date-time-field";
import { StatusToast } from "@/components/status-toast";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "@/lib/date-format";
import {
  scrollToElementTopAfterRender,
  useBodyScrollLock,
  useDialogFocusLifecycle,
  useToastDismiss,
  useTrackerRouteReselect,
} from "@/lib/ledger-ui";
import type { TableColumn } from "@/lib/tracker-modules";
import { formatDisplayDate } from "@/lib/tracker-summary";
import { filterTrackerRows, getTrackerPageCount, paginateTrackerRows } from "@/lib/tracker-table";
import type { TrackerRow } from "@/lib/tracker-types";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import {
  accountLifecycleOptions,
  accountRestrictionOptions,
  dedupeOptions,
} from "@/lib/workbook-options";
import type {
  BookmakerCatalogueRecord,
  MasterAccountCatalogue,
  MasterAccountCatalogueRecord,
  MasterAccountOperatingContext,
} from "@/lib/bookmaker-catalogue";
import {
  findMasterAccountCatalogueEntry,
  isMasterAccountAvailable,
  masterAccountProfileType,
} from "@/lib/bookmaker-catalogue";

type AccountRecord = {
  account_id: string;
  profile_id: string;
  catalogue_id: string | null;
  bookmaker_id: string | null;
  account: string;
  type: string;
  counts_in_cash_total: boolean;
  channel: string;
  status: string;
  lifecycle_status: string;
  restrictions: string[];
  current_balance: string;
  pending_withdrawal_amount: string;
  last_balance_update: string;
  group_name: string;
  platform: string;
  sign_up_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

type AccountFormState = {
  account_id?: string;
  catalogue_id: string;
  bookmaker_id: string;
  account: string;
  type: string;
  counts_in_cash_total: boolean;
  channel: string;
  status: string;
  lifecycle_status: string;
  restrictions: string[];
  current_balance: string;
  pending_withdrawal_amount: string;
  last_balance_update: string;
  group_name: string;
  platform: string;
  sign_up_date: string;
  notes: string;
  commission_rate: string;
};

type ExchangeCommissionRecord = {
  exchange_name: string;
  commission_rate: string;
};

type ProfileOfferAction = {
  preset_id: string;
  label: string;
  ledger_type: string;
  bookmaker: string;
  availability: "eligible" | "limited" | "blocked";
  availability_reason: string;
  enabled: boolean;
  archived: boolean;
};

type AccountTableMode =
  | "All"
  | "Recent"
  | "Active"
  | "Not Signed Up"
  | "Limited / Gubbed"
  | "Bookie"
  | "Exchange"
  | "Bank"
  | "Cash total";

type AccountTableFilters = {
  type: "" | "Bookie" | "Exchange" | "Bank";
  status: string;
  restriction: string;
  channel: string;
  issue: "" | "all-issues" | "not-signed-up" | "restricted";
  cashTotal: "" | "yes" | "no";
};

const accountTableModes: Array<{ label: string; value: AccountTableMode }> = [
  { label: "Recent", value: "Recent" },
  { label: "All", value: "All" },
  { label: "Active", value: "Active" },
  { label: "Not Signed Up", value: "Not Signed Up" },
  { label: "Restricted / Gubbed", value: "Limited / Gubbed" },
  { label: "Bookie", value: "Bookie" },
  { label: "Exchange", value: "Exchange" },
  { label: "Bank", value: "Bank" },
  { label: "Cash total", value: "Cash total" },
];

type AccountColumnKey =
  | "account_id"
  | "account"
  | "type"
  | "status"
  | "counts_in_cash_total"
  | "current_balance"
  | "pending_withdrawal_amount"
  | "last_balance_update"
  | "channel"
  | "group_name"
  | "platform"
  | "actions";

type AccountSortKey = Exclude<AccountColumnKey, "actions">;
type AccountSort = { key: AccountSortKey; direction: "asc" | "desc" };

const tableColumns: Array<TableColumn & { key: AccountColumnKey }> = [
  { key: "account_id", label: "Account ID" },
  { key: "account", label: "Account" },
  { key: "type", label: "Type" },
  { key: "status", label: "Status" },
  { key: "counts_in_cash_total", label: "Counts in cash" },
  { key: "current_balance", label: "Current balance", align: "end" },
  { key: "pending_withdrawal_amount", label: "Pending withdrawal", align: "end" },
  { key: "last_balance_update", label: "Last balance update" },
  { key: "channel", label: "Channel" },
  { key: "group_name", label: "Group" },
  { key: "platform", label: "Platform" },
  { key: "actions", label: "Actions" },
];

const lockedAccountColumns = new Set<AccountColumnKey>([
  "account",
  "current_balance",
  "pending_withdrawal_amount",
  "actions",
]);

const defaultVisibleAccountColumns = tableColumns.map((column) => column.key);

const defaultAccountColumnWidths: Record<AccountColumnKey, number> = {
  account_id: 120,
  account: 170,
  type: 175,
  status: 220,
  counts_in_cash_total: 145,
  current_balance: 150,
  pending_withdrawal_amount: 175,
  last_balance_update: 180,
  channel: 155,
  group_name: 165,
  platform: 160,
  actions: 110,
};

const emptyAccountTableFilters: AccountTableFilters = {
  type: "",
  status: "",
  restriction: "",
  channel: "",
  issue: "",
  cashTotal: "",
};

function createBlankForm(): AccountFormState {
  return {
    catalogue_id: "",
    bookmaker_id: "",
    account: "",
    type: "",
    counts_in_cash_total: true,
    channel: "Unknown",
    status: "Not Signed Up",
    lifecycle_status: "Not Signed Up",
    restrictions: [],
    current_balance: "",
    pending_withdrawal_amount: "",
    last_balance_update: "",
    group_name: "",
    platform: "",
    sign_up_date: "",
    notes: "",
    commission_rate: "",
  };
}

function recordToForm(record: AccountRecord, commissionRate = ""): AccountFormState {
  return {
    account_id: record.account_id,
    catalogue_id: record.catalogue_id ?? "",
    bookmaker_id: record.bookmaker_id ?? "",
    account: record.account,
    type: record.type,
    counts_in_cash_total: record.counts_in_cash_total,
    channel: record.channel,
    status: record.status,
    lifecycle_status: record.lifecycle_status,
    restrictions: record.restrictions,
    current_balance: record.current_balance,
    pending_withdrawal_amount: record.pending_withdrawal_amount,
    last_balance_update: toDateTimeLocalValue(record.last_balance_update),
    group_name: record.group_name,
    platform: record.platform,
    sign_up_date: record.sign_up_date,
    notes: record.notes,
    commission_rate: commissionRate,
  };
}

function parseAmount(value: string) {
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizedFinancialInput(value: string) {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed.toFixed(2) : value;
}

function financialInputTone(value: string): "positive" | "negative" | "neutral" {
  const amount = parseAmount(value);
  return amount > 0 ? "positive" : amount < 0 ? "negative" : "neutral";
}

function accountTypeChipClass(type: string) {
  if (type === "Exchange") return "table-chip-info";
  if (type === "Bank") return "table-chip-offer";
  return "table-chip-strategy-standard";
}

function accountStatusChipClass(status: string) {
  if (status === "Active") return "table-chip-lay-full";
  if (["Restricted", "Gubbed", "Inactive", "Bonus Restricted", "Limited"].includes(status)) {
    return "table-chip-danger";
  }
  if (["Pending Sign Up", "Verification Pending"].includes(status)) return "table-chip-lay-partial";
  return "table-chip-muted";
}

function inheritGlobalProviderMetadata(
  record: AccountRecord,
  catalogue: MasterAccountCatalogueRecord[]
): AccountRecord {
  const provider = findMasterAccountCatalogueEntry(catalogue, {
    catalogueId: record.catalogue_id,
    accountName: record.account,
  });
  if (!provider) return record;
  return {
    ...record,
    catalogue_id: provider.catalogue_id,
    account: provider.brand_name,
    type: masterAccountProfileType(provider),
    group_name: provider.operator_group,
    platform: provider.platform,
  };
}

function parseChannels(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function readApiError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null) as { detail?: string } | null;
  return typeof body?.detail === "string" ? body.detail : fallback;
}

function hasAccountIssue(row: AccountRecord) {
  return (
    row.lifecycle_status === "Not Signed Up" ||
    row.status === "Not Signed Up" ||
    row.lifecycle_status === "Pending Sign Up" ||
    row.lifecycle_status === "Verification Pending" ||
    row.restrictions.length > 0
  );
}

function sortAccountRows(rows: TrackerRow[], sort: AccountSort | null) {
  if (!sort) return rows;
  return [...rows].sort((left, right) => {
    const leftValue = String(left[sort.key] ?? "");
    const rightValue = String(right[sort.key] ?? "");
    const numericKeys: AccountSortKey[] = ["current_balance", "pending_withdrawal_amount"];
    const comparison = numericKeys.includes(sort.key)
      ? parseAmount(leftValue) - parseAmount(rightValue)
      : leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: "base" });
    return sort.direction === "asc" ? comparison : -comparison;
  });
}

export function AccountsWorkflowShell({ profileId }: { profileId: string }) {
  const [rows, setRows] = useState<AccountRecord[]>([]);
  const [bookmakerCatalogue, setBookmakerCatalogue] = useState<BookmakerCatalogueRecord[]>([]);
  const [masterAccountCatalogue, setMasterAccountCatalogue] = useState<MasterAccountCatalogueRecord[]>([]);
  const [exchangeCommissions, setExchangeCommissions] = useState<ExchangeCommissionRecord[]>([]);
  const [offerActions, setOfferActions] = useState<ProfileOfferAction[]>([]);
  const exchangeCommissionsRef = useRef<ExchangeCommissionRecord[]>([]);
  const [masterAccountContext, setMasterAccountContext] = useState<MasterAccountOperatingContext>({
    jurisdiction: "",
    subdivision: "",
    channels: [],
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workflowVisible, setWorkflowVisible] = useState(false);
  const [formState, setFormState] = useState<AccountFormState>(createBlankForm);
  const [pristineFormState, setPristineFormState] = useState<AccountFormState>(createBlankForm);
  const [tableMode, setTableMode] = useState<AccountTableMode>("All");
  const [tableFilters, setTableFilters] = useState<AccountTableFilters>(emptyAccountTableFilters);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<AccountColumnKey>>(
    () => new Set(defaultVisibleAccountColumns)
  );
  const [columnWidths, setColumnWidths] = useState<Record<AccountColumnKey, number>>(
    defaultAccountColumnWidths
  );
  const [tableSort, setTableSort] = useState<AccountSort | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isArchiveConfirmationOpen, setIsArchiveConfirmationOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const editorRef = useRef<HTMLElement | null>(null);
  const filterDialogRef = useRef<HTMLElement | null>(null);
  const isCreatingDraftRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const isDirty = useMemo(
    () => JSON.stringify(formState) !== JSON.stringify(pristineFormState),
    [formState, pristineFormState]
  );
  const confirmDiscardChanges = useUnsavedChangesGuard(workflowVisible && isDirty);
  useBodyScrollLock(workflowVisible || isFilterModalOpen);
  useDialogFocusLifecycle(workflowVisible, editorRef);
  useDialogFocusLifecycle(isFilterModalOpen, filterDialogRef);
  const clearStatusMessage = useCallback(() => setStatusMessage(""), []);

  useToastDismiss(statusMessage, clearStatusMessage);

  const revealEditor = useCallback(() => {
    scrollToElementTopAfterRender(() => editorRef.current);
  }, []);

  useTrackerRouteReselect(() => {
    scrollToElementTopAfterRender(() => editorRef.current);
  });

  const loadRows = useCallback(
    async (preferredSelection?: string | null) => {
      const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/accounts`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Unable to load account rows");
      }

      const nextRows = (await response.json()) as AccountRecord[];
      startTransition(() => {
        setRows(nextRows);
        const selected =
          preferredSelection && nextRows.some((row) => row.account_id === preferredSelection)
            ? preferredSelection
            : null;
        setSelectedId(selected);
        if (selected) {
          isCreatingDraftRef.current = false;
          const activeRecord = nextRows.find((row) => row.account_id === selected);
          if (activeRecord) {
            const nextFormState = recordToForm(
              activeRecord,
              exchangeCommissionsRef.current.find(
                (commission) => commission.exchange_name === activeRecord.account
              )?.commission_rate ?? ""
            );
            setFormState(nextFormState);
            setPristineFormState(nextFormState);
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
          setWorkflowVisible(false);
        }
      });
    },
    [profileId, startTransition]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void Promise.all([
        loadRows(),
        fetch(`${apiBaseUrl}/bookmaker-catalogue`, { cache: "no-store" }).then(
          async (response) => {
            if (!response.ok) {
              throw new Error("Unable to load bookmaker catalogue");
            }
            setBookmakerCatalogue((await response.json()) as BookmakerCatalogueRecord[]);
          }
        ),
        fetch(`${apiBaseUrl}/account-catalogue/source`, { cache: "no-store" }).then(
          async (response) => {
            if (!response.ok) {
              throw new Error("Unable to load the master account catalogue");
            }
            const catalogue = (await response.json()) as MasterAccountCatalogue;
            setMasterAccountCatalogue(catalogue.records);
            setMasterAccountContext({
              jurisdiction: catalogue.default_operating_context.jurisdiction || "GB",
              subdivision: catalogue.default_operating_context.subdivision,
              channels: catalogue.default_operating_context.channels.length
                ? catalogue.default_operating_context.channels
                : ["web", "mobile", "retail"],
            });
          }
        ),
        fetch(`${apiBaseUrl}/profiles/${profileId}/exchange-commissions`, {
          cache: "no-store",
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error("Unable to load Profile Exchange commissions");
          }
          const commissions = (await response.json()) as ExchangeCommissionRecord[];
          exchangeCommissionsRef.current = commissions;
          setExchangeCommissions(commissions);
        }),
        fetch(
          `${apiBaseUrl}/fund-manager/common-bet-combos/profile-overrides/${profileId}?include_hidden=true`,
          { cache: "no-store" }
        ).then(async (response) => {
          if (!response.ok) return;
          setOfferActions((await response.json()) as ProfileOfferAction[]);
        }),
      ])
        .catch((error: Error) => {
          setErrorMessage(error.message);
        })
        .finally(() => setIsInitialLoading(false));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadRows, profileId]);

  const resolvedRows = useMemo(
    () => rows.map((row) => inheritGlobalProviderMetadata(row, masterAccountCatalogue)),
    [masterAccountCatalogue, rows]
  );
  const selectedRow = useMemo(
    () => resolvedRows.find((row) => row.account_id === selectedId) ?? null,
    [resolvedRows, selectedId]
  );

  const selectedProvider = useMemo(
    () => findMasterAccountCatalogueEntry(masterAccountCatalogue, {
      catalogueId: formState.catalogue_id,
      accountName: formState.account,
    }),
    [formState.account, formState.catalogue_id, masterAccountCatalogue]
  );
  const resolvedAccountType = selectedProvider
    ? masterAccountProfileType(selectedProvider)
    : formState.type;
  const isBankAccount = resolvedAccountType === "Bank";

  const availableMasterAccounts = useMemo(
    () => masterAccountCatalogue
      .filter((record) => isMasterAccountAvailable(
        record,
        masterAccountContext.jurisdiction,
        masterAccountContext.channels,
        masterAccountContext.subdivision
      ))
      .filter((record) => !rows.some((row) => {
        const expectedType = record.account_type === "Bookmaker" ? "Bookie" : record.account_type;
        return row.catalogue_id === record.catalogue_id || (
          row.type === expectedType && row.account.toLocaleLowerCase() === record.brand_name.toLocaleLowerCase()
        );
      }))
      .sort((left, right) =>
        left.account_type.localeCompare(right.account_type, "en-GB") ||
        left.brand_name.localeCompare(right.brand_name, "en-GB", { numeric: true })
      ),
    [masterAccountCatalogue, masterAccountContext, rows]
  );

  const selectedOfferActions = useMemo(() => {
    const accountName = formState.account.trim().toLocaleLowerCase();
    if (!accountName) return [];
    const unique = new Map<string, ProfileOfferAction>();
    for (const action of offerActions) {
      if (
        action.enabled &&
        !action.archived &&
        action.availability !== "blocked" &&
        action.bookmaker.trim().toLocaleLowerCase() === accountName
      ) {
        unique.set(`${action.ledger_type}:${action.label}`, action);
      }
    }
    return [...unique.values()].sort((left, right) =>
      left.ledger_type.localeCompare(right.ledger_type) || left.label.localeCompare(right.label)
    );
  }, [formState.account, offerActions]);

  const accountQuickView = useMemo(() => {
    const activeAccounts = resolvedRows.filter((row) => row.status === "Active").length;
    const restrictedAccounts = resolvedRows.filter((row) =>
      ["Bonus Restricted", "Limited", "Gubbed", "Inactive"].includes(row.status)
    ).length;
    const cashTotalAccounts = resolvedRows.filter((row) => row.counts_in_cash_total);
    const cashIncludedBalance = cashTotalAccounts.reduce(
      (sum, row) => sum + parseAmount(row.current_balance),
      0
    );
    const pendingWithdrawals = resolvedRows.reduce(
      (sum, row) => sum + parseAmount(row.pending_withdrawal_amount),
      0
    );
    const bookieCount = resolvedRows.filter((row) => row.type === "Bookie").length;
    const exchangeCount = resolvedRows.filter((row) => row.type === "Exchange").length;
    const bankCount = resolvedRows.filter((row) => row.type === "Bank").length;

    return {
      activeAccounts,
      restrictedAccounts,
      cashIncludedBalance,
      cashTotalCount: cashTotalAccounts.length,
      pendingWithdrawals,
      bookieCount,
      exchangeCount,
      bankCount,
    };
  }, [resolvedRows]);

  const reviewRows = useMemo(() => {
    switch (tableMode) {
      case "Active":
        return resolvedRows.filter((row) => row.status === "Active");
      case "Not Signed Up":
        return resolvedRows.filter(
          (row) => row.status === "Not Signed Up" || row.lifecycle_status === "Not Signed Up"
        );
      case "Limited / Gubbed":
        return resolvedRows.filter((row) =>
          ["Bonus Restricted", "Limited", "Gubbed", "Inactive"].includes(row.status)
        );
      case "Bookie":
      case "Exchange":
      case "Bank":
        return resolvedRows.filter((row) => row.type === tableMode);
      case "Cash total":
        return resolvedRows.filter((row) => row.counts_in_cash_total);
      case "Recent":
        return [...resolvedRows].sort((left, right) =>
          Date.parse(right.updated_at || right.created_at) - Date.parse(left.updated_at || left.created_at)
        );
      case "All":
      default:
        return resolvedRows;
    }
  }, [resolvedRows, tableMode]);

  const accountFilterOptions = useMemo(
    () => ({
      statuses: dedupeOptions(resolvedRows.map((row) => row.status)),
      restrictions: dedupeOptions(resolvedRows.flatMap((row) => row.restrictions)),
      channels: dedupeOptions(resolvedRows.map((row) => row.channel)),
    }),
    [resolvedRows]
  );

  const filterRows = useCallback(
    (sourceRows: AccountRecord[]) =>
      sourceRows.filter((row) => {
        if (tableFilters.type && row.type !== tableFilters.type) return false;
        if (tableFilters.status && row.status !== tableFilters.status) return false;
        if (
          tableFilters.restriction &&
          !row.restrictions.includes(tableFilters.restriction)
        ) {
          return false;
        }
        if (tableFilters.channel && !parseChannels(row.channel).includes(tableFilters.channel)) return false;
        if (tableFilters.issue === "all-issues" && !hasAccountIssue(row)) return false;
        if (
          tableFilters.issue === "not-signed-up" &&
          row.status !== "Not Signed Up" &&
          row.lifecycle_status !== "Not Signed Up"
        ) {
          return false;
        }
        if (tableFilters.issue === "restricted" && row.restrictions.length === 0) return false;
        if (
          tableFilters.cashTotal &&
          String(row.counts_in_cash_total) !== String(tableFilters.cashTotal === "yes")
        ) {
          return false;
        }
        return true;
      }),
    [tableFilters]
  );

  const filteredRows = useMemo(() => {
    const tableRows: TrackerRow[] = filterRows(reviewRows).map((row) => ({
      account_id: row.account_id,
      account: row.account,
      type: row.type,
      status: row.status,
      counts_in_cash_total: row.counts_in_cash_total ? "Yes" : "No",
      current_balance: row.current_balance,
      pending_withdrawal_amount: row.pending_withdrawal_amount,
      last_balance_update: formatDisplayDate(row.last_balance_update),
      channel: row.channel,
      group_name: row.group_name,
      platform: row.platform,
      actions: "",
    }));
    return sortAccountRows(filterTrackerRows(tableRows, tableColumns, query), tableSort);
  }, [filterRows, query, reviewRows, tableSort]);

  const visibleTableColumns = useMemo(
    () => tableColumns.filter((column) => visibleColumnKeys.has(column.key)),
    [visibleColumnKeys]
  );

  const activeFilterCount = useMemo(
    () =>
      [
        tableFilters.type,
        tableFilters.status,
        tableFilters.restriction,
        tableFilters.channel,
        tableFilters.issue,
        tableFilters.cashTotal,
      ].filter(Boolean).length,
    [tableFilters]
  );
  const hiddenColumnCount = tableColumns.length - visibleTableColumns.length;
  const hasActiveTableControls =
    tableMode !== "All" || activeFilterCount > 0 || hiddenColumnCount > 0;
  const activeTableControlCount =
    (tableMode !== "All" ? 1 : 0) + activeFilterCount + hiddenColumnCount;

  const toggleTableSort = useCallback((key: AccountSortKey) => {
    setTableSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  }, []);

  const startColumnResize = useCallback((event: React.MouseEvent<HTMLSpanElement>, key: AccountColumnKey, headerCell: HTMLTableCellElement | null) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const initialWidth = headerCell?.getBoundingClientRect().width ?? columnWidths[key];
    const onMove = (moveEvent: MouseEvent) => {
      setColumnWidths((current) => ({ ...current, [key]: Math.max(96, Math.round(initialWidth + moveEvent.clientX - startX)) }));
    };
    const onEnd = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
  }, [columnWidths]);

  const pageCount = getTrackerPageCount(filteredRows.length, pageSize);
  const effectivePage = Math.min(currentPage, pageCount);
  const pagedRows = useMemo(
    () => paginateTrackerRows(filteredRows, effectivePage, pageSize),
    [effectivePage, filteredRows, pageSize]
  );

  async function selectRow(rowId: string) {
    if (rowId !== selectedId && isDirty && !(await confirmDiscardChanges())) {
      return;
    }
    const record = resolvedRows.find((entry) => entry.account_id === rowId);
    if (!record) {
      return;
    }
    setSelectedId(rowId);
    isCreatingDraftRef.current = false;
    setWorkflowVisible(true);
    const provider = findMasterAccountCatalogueEntry(masterAccountCatalogue, {
      catalogueId: record.catalogue_id,
      accountName: record.account,
    });
    const nextFormState = {
      ...recordToForm(
      record,
      exchangeCommissions.find(
        (commission) => commission.exchange_name === record.account
      )?.commission_rate ?? ""
      ),
      ...(provider ? {
        catalogue_id: provider.catalogue_id,
        account: provider.brand_name,
        type: masterAccountProfileType(provider),
        group_name: provider.operator_group,
        platform: provider.platform,
      } : {}),
    };
    setFormState(nextFormState);
    setPristineFormState(nextFormState);
    setErrorMessage("");
    revealEditor();
    setStatusMessage("");
  }

  async function startNewRow() {
    if (isDirty && !(await confirmDiscardChanges())) {
      return;
    }
    setSelectedId(null);
    isCreatingDraftRef.current = true;
    setWorkflowVisible(true);
    const blankForm = createBlankForm();
    setFormState(blankForm);
    setPristineFormState(blankForm);
    setErrorMessage("");
    revealEditor();
    setStatusMessage("");
  }

  function handleResetForm() {
    if (selectedRow) {
      const nextFormState = recordToForm(
        selectedRow,
        exchangeCommissions.find(
          (commission) => commission.exchange_name === selectedRow.account
        )?.commission_rate ?? ""
      );
      setFormState(nextFormState);
      setPristineFormState(nextFormState);
      setErrorMessage("");
      setStatusMessage(`Reverted unsaved changes for account ${selectedRow.account_id}.`);
      return;
    }

    const blankForm = createBlankForm();
    setFormState(blankForm);
    setPristineFormState(blankForm);
    setErrorMessage("");
    setWorkflowVisible(false);
    isCreatingDraftRef.current = false;
    setStatusMessage("Cleared the unsaved account draft.");
  }

  async function closeEditor() {
    if (isDirty && !(await confirmDiscardChanges())) {
      return;
    }
    isCreatingDraftRef.current = false;
    setSelectedId(null);
    setWorkflowVisible(false);
    setIsArchiveConfirmationOpen(false);
    setErrorMessage("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveInFlightRef.current || isSaving || isArchiving) return;
    setErrorMessage("");
    const isEditing = Boolean(selectedId);
    if (!isEditing && !formState.catalogue_id) {
      setErrorMessage("Select an account from the Fund Manager Account Catalogue.");
      return;
    }
    if (
      !isEditing &&
      formState.type === "Exchange" &&
      (!formState.commission_rate.trim() ||
        !Number.isFinite(Number(formState.commission_rate)) ||
        Number(formState.commission_rate) < 0 ||
        Number(formState.commission_rate) > 1)
    ) {
      setErrorMessage("Enter the Exchange commission as a decimal fraction from 0 to 1.");
      return;
    }
    const url = isEditing
      ? `${apiBaseUrl}/profiles/${profileId}/accounts/${selectedId}`
      : `${apiBaseUrl}/profiles/${profileId}/accounts`;
    const method = isEditing ? "PUT" : "POST";

    saveInFlightRef.current = true;
    setIsSaving(true);
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formState,
          restrictions: isBankAccount ? [] : formState.restrictions,
          commission_rate:
            !isEditing && formState.type === "Exchange"
              ? formState.commission_rate
              : undefined,
          status: formState.lifecycle_status,
          last_balance_update: fromDateTimeLocalValue(formState.last_balance_update),
        }),
      });

      if (!response.ok) {
        setErrorMessage(await readApiError(response, "Account could not be saved."));
        return;
      }

      const saved = (await response.json()) as AccountRecord;
      isCreatingDraftRef.current = false;
      setRows((current) => isEditing
        ? current.map((row) => row.account_id === saved.account_id ? saved : row)
        : [...current, saved]);
      const refreshed = await fetch(`${apiBaseUrl}/profiles/${profileId}/accounts`, { cache: "no-store" });
      if (refreshed.ok) setRows((await refreshed.json()) as AccountRecord[]);
      setSelectedId(null);
      setWorkflowVisible(false);
      setStatusMessage(
        !refreshed.ok
          ? "Account saved. The latest row is shown while the full table refresh retries."
          : isEditing
          ? `Updated account ${saved.account_id}.`
          : `Created account ${saved.account_id}.`
      );
    } catch {
      setErrorMessage("Account could not be saved. Please try again.");
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);
    }
  }

  async function archiveSelectedAccount() {
    if (!selectedRow || isSaving || isArchiving) return;
    setErrorMessage("");
    setIsArchiving(true);
    try {
      const response = await fetch(
        `${apiBaseUrl}/profiles/${profileId}/accounts/${selectedRow.account_id}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        setErrorMessage(await readApiError(response, "Account could not be removed from the Profile."));
        return;
      }
      isCreatingDraftRef.current = false;
      await loadRows(null);
      setWorkflowVisible(false);
      setStatusMessage(`${selectedRow.account} was removed from this Profile.`);
      setIsArchiveConfirmationOpen(false);
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <section className="stack">
      <StatusToast message={statusMessage} onDismiss={clearStatusMessage} />
      <section
        aria-busy={isInitialLoading}
        className="content-panel stack sportsbook-page-shell"
      >
        <div className="sportsbook-page-header accounts-page-header">
          <h1 className="sportsbook-page-title">Accounts</h1>
        </div>
        {isInitialLoading ? (
          <LedgerLoadingIndicator
            dataPdId="profile-accounts.loading"
            label="Loading Profile Accounts"
          />
        ) : null}
        <section className="stat-strip" aria-label="Account quick view">
          <article className="stat-card">
            <span className="eyebrow">Active accounts</span>
            <strong>{accountQuickView.activeAccounts}</strong>
            <p className="lede">Restricted {accountQuickView.restrictedAccounts}</p>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Bankroll</span>
            <strong><FinancialValue value={accountQuickView.cashIncludedBalance} /></strong>
            <p className="lede">{accountQuickView.cashTotalCount} accounts included</p>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Bookmaker balances</span>
            <strong><FinancialValue value={resolvedRows.filter((row) => row.type === "Bookie").reduce((sum, row) => sum + parseAmount(row.current_balance), 0)} /></strong>
            <p className="lede">Profile bookmaker cash</p>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Exchange balances</span>
            <strong><FinancialValue value={resolvedRows.filter((row) => row.type === "Exchange").reduce((sum, row) => sum + parseAmount(row.current_balance), 0)} /></strong>
            <p className="lede">Profile exchange cash</p>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Pending withdrawals</span>
            <strong><FinancialValue value={accountQuickView.pendingWithdrawals} /></strong>
            <p className="lede">Across all tracked account rows for this profile.</p>
          </article>
        </section>
        <>
            <div
              aria-label="Accounts controls"
              className="sportsbook-review-bar"
              data-pd-id="accounts.table-toolbar"
              role="toolbar"
            >
              <label className="field-control table-search-field">
                <span className="visually-hidden">Search accounts</span>
                <input
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search account rows"
                  type="search"
                  value={query}
                />
              </label>
              <div className="extra-place-toolbar-actions">
                <LedgerAddRowButton label="Add Account" onClick={startNewRow} />
                <div className="table-filter-button-wrap">
                  <button
                    aria-haspopup="dialog"
                    aria-label="Filter accounts"
                    className={`icon-button table-filter-button${hasActiveTableControls ? " has-active-table-controls" : ""}`}
                    data-pd-id="accounts.toolbar.filter"
                    onClick={() => setIsFilterModalOpen(true)}
                    title="Filter accounts"
                    type="button"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined">filter_alt</span>
                    {hasActiveTableControls ? (
                      <span aria-label={`${activeTableControlCount} active account table controls`} className="table-filter-badge">
                        {activeTableControlCount > 9 ? "9+" : activeTableControlCount}
                      </span>
                    ) : null}
                  </button>
                  {hasActiveTableControls ? (
                    <button
                      aria-label="Clear active account filters and visible columns"
                      className="table-filter-clear"
                      onClick={() => {
                        setTableFilters(emptyAccountTableFilters);
                        setTableMode("All");
                        setVisibleColumnKeys(new Set(defaultVisibleAccountColumns));
                        setCurrentPage(1);
                      }}
                      type="button"
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="extra-place-table-heading-controls" data-pd-id="accounts.table-loadouts">
              <div className="tracker-nav extra-place-loadouts" role="group" aria-label="Accounts review modes">
                {accountTableModes.filter((mode) => ["Active", "Not Signed Up", "Limited / Gubbed", "Bookie", "Exchange"].includes(mode.value)).map((mode) => (
                  <button
                    aria-pressed={tableMode === mode.value}
                    className={`review-chip${tableMode === mode.value ? " is-active" : ""}`}
                    key={mode.value}
                    onClick={() => {
                      setTableMode(mode.value);
                      setCurrentPage(1);
                    }}
                    type="button"
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
            {errorMessage ? (
              <p className="error-text" role="alert">
                {errorMessage}
              </p>
            ) : null}
            <LedgerPagination
              ariaLabel="Accounts"
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
            <LedgerTableScroll dataPdId="accounts.table-scroll">
              <table className="data-table accounts-data-table">
                <colgroup>
                  {visibleTableColumns.map((column) => (
                    <col key={column.key} style={{ width: `${columnWidths[column.key]}px` }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    {visibleTableColumns.map((column) => {
                      const sortable = column.key !== "actions";
                      const activeSort = tableSort?.key === column.key;
                      const marker = activeSort ? tableSort.direction === "asc" ? "▲" : "▼" : "↕";
                      return (
                      <th
                        aria-sort={sortable ? activeSort ? tableSort.direction === "asc" ? "ascending" : "descending" : "none" : undefined}
                        className={column.align === "end" ? "align-end" : undefined}
                        key={column.key}
                        scope="col"
                      >
                        <div className="table-header-cell">
                          {sortable ? (
                            <button className={`table-sort-button${activeSort ? " is-active" : ""}`} onClick={() => toggleTableSort(column.key as AccountSortKey)} type="button">
                              <span>{column.label}</span><span aria-hidden="true">{marker}</span>
                            </button>
                          ) : <span className="table-header-label">{column.label}</span>}
                          <span
                            aria-hidden="true"
                            className="table-column-resize-handle"
                            onMouseDown={(event) =>
                              startColumnResize(event, column.key, event.currentTarget.closest("th"))
                            }
                          />
                        </div>
                      </th>
                    );})}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length === 0 ? (
                    <tr>
                      <td className="empty-cell" colSpan={visibleTableColumns.length}>
                        No account rows match the current filter.
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((row) => {
                      const rowId = String(row.account_id);
                      const accountRecord = resolvedRows.find((entry) => entry.account_id === rowId);
                      const provider = findMasterAccountCatalogueEntry(masterAccountCatalogue, {
                        catalogueId: accountRecord?.catalogue_id,
                        accountName: String(row.account ?? ""),
                      });
                      return (
                        <tr
                          className={selectedId === rowId ? "is-selected-row" : undefined}
                          key={rowId}
                          onClick={() => void selectRow(rowId)}
                        >
                          {visibleTableColumns.map((column) => (
                            <td
                              className={column.align === "end" ? "align-end" : undefined}
                              key={column.key}
                            >
                              {column.key === "account" ? (
                                <AccountProviderIdentity fallbackName={String(row.account ?? "")} provider={provider} />
                              ) : column.key === "type" ? (
                                <span className={`table-chip ${accountTypeChipClass(provider ? masterAccountProfileType(provider) : String(row.type))}`}>
                                  {provider ? masterAccountProfileType(provider) : String(row.type || "—")}
                                </span>
                              ) : column.key === "status" ? (
                                <span className={`table-chip ${accountStatusChipClass(String(row.status))}`}>{String(row.status || "—")}</span>
                              ) : column.key === "channel" ? (
                                <span className="table-chip-stack table-chip-stack-centered">
                                  {parseChannels(String(row.channel)).map((channel) => (
                                    <span className="table-chip table-chip-info" key={channel}>{channel}</span>
                                  ))}
                                </span>
                              ) : column.key === "current_balance" || column.key === "pending_withdrawal_amount" ? (
                                <span className="table-chip accounts-financial-chip"><FinancialValue animate={false} value={String(row[column.key] || "0")} /></span>
                              ) : column.key === "actions" ? (
                                <button
                                  aria-label={`Edit ${String(row.account ?? "account")}`}
                                  className="icon-button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void selectRow(rowId);
                                  }}
                                  title="Edit account"
                                  type="button"
                                >
                                  <span aria-hidden="true" className="material-symbols-outlined">edit</span>
                                </button>
                              ) : (row[column.key] || "—")}
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
              ariaLabel="Accounts"
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
      </section>

      {isFilterModalOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="modal-backdrop" onMouseDown={(event) => {
              if (event.target === event.currentTarget) setIsFilterModalOpen(false);
            }}>
              <section aria-labelledby="accounts-filter-title" aria-modal="true" className="modal-panel accounts-filter-modal" ref={filterDialogRef} role="dialog" tabIndex={-1}>
                <header className="modal-sticky-header sportsbook-page-header">
                  <div>
                    <span className="eyebrow">Table controls</span>
                    <h2 id="accounts-filter-title">Filter accounts</h2>
                  </div>
                  <button aria-label="Close account filters" className="modal-close-button" data-initial-focus onClick={() => setIsFilterModalOpen(false)} type="button">
                    <span aria-hidden="true" className="material-symbols-outlined">close</span>
                  </button>
                </header>
                <div className="form-grid accounts-filter-form-grid">
                  <label className="field-control"><span>View</span><select value={tableMode} onChange={(event) => { setTableMode(event.target.value as AccountTableMode); setCurrentPage(1); }}>
                    {accountTableModes.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
                  </select></label>
                  <label className="field-control"><span>Account type</span><select value={tableFilters.type} onChange={(event) => setTableFilters((current) => ({ ...current, type: event.target.value as AccountTableFilters["type"] }))}><option value="">All</option><option value="Bookie">Bookie</option><option value="Exchange">Exchange</option><option value="Bank">Bank</option></select></label>
                  <label className="field-control"><span>Status</span><select value={tableFilters.status} onChange={(event) => setTableFilters((current) => ({ ...current, status: event.target.value }))}><option value="">All</option>{accountFilterOptions.statuses.map((option) => <option key={option}>{option}</option>)}</select></label>
                  <label className="field-control"><span>Restriction</span><select value={tableFilters.restriction} onChange={(event) => setTableFilters((current) => ({ ...current, restriction: event.target.value }))}><option value="">All</option>{accountFilterOptions.restrictions.map((option) => <option key={option}>{option}</option>)}</select></label>
                  <label className="field-control"><span>Access</span><select value={tableFilters.channel} onChange={(event) => setTableFilters((current) => ({ ...current, channel: event.target.value }))}><option value="">All</option>{accountFilterOptions.channels.map((option) => <option key={option}>{option}</option>)}</select></label>
                  <label className="field-control"><span>Issues</span><select value={tableFilters.issue} onChange={(event) => setTableFilters((current) => ({ ...current, issue: event.target.value as AccountTableFilters["issue"] }))}><option value="">All rows</option><option value="all-issues">Needs action</option><option value="not-signed-up">Not signed up</option><option value="restricted">Restricted</option></select></label>
                  <label className="field-control"><span>Cash total</span><select value={tableFilters.cashTotal} onChange={(event) => setTableFilters((current) => ({ ...current, cashTotal: event.target.value as AccountTableFilters["cashTotal"] }))}><option value="">All</option><option value="yes">Included</option><option value="no">Excluded</option></select></label>
                </div>
                <section className="stack-tight" aria-label="Visible account columns">
                  <strong>Visible columns</strong>
                  <div className="review-chip-row">
                    {tableColumns.map((column) => {
                      const locked = lockedAccountColumns.has(column.key);
                      const visible = visibleColumnKeys.has(column.key);
                      return (
                        <button
                          aria-pressed={visible}
                          className={`review-chip${visible ? " is-active" : ""}`}
                          disabled={locked}
                          key={column.key}
                          onClick={() => setVisibleColumnKeys((current) => {
                            if (locked) return current;
                            const next = new Set(current);
                            if (next.has(column.key)) next.delete(column.key); else next.add(column.key);
                            return next;
                          })}
                          type="button"
                        >
                          {locked ? column.label : `${visible ? "Hide" : "Show"} ${column.label}`}
                        </button>
                      );
                    })}
                  </div>
                </section>
                <div className="tracker-nav">
                  <button className="review-chip" onClick={() => { setTableFilters(emptyAccountTableFilters); setTableMode("All"); setVisibleColumnKeys(new Set(defaultVisibleAccountColumns)); setCurrentPage(1); }} type="button">Clear filters</button>
                  <button className="review-chip review-chip-copy" onClick={() => { setCurrentPage(1); setIsFilterModalOpen(false); }} type="button">Done</button>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}

      {workflowVisible && typeof document !== "undefined"
        ? createPortal(
            <div className="modal-backdrop" onMouseDown={(event) => {
              if (event.target === event.currentTarget) void closeEditor();
            }}>
      <section aria-label={selectedId ? "Edit account" : "Create account"} aria-modal="true" className="content-panel stack workflow-editor-panel modal-panel workflow-editor-modal accounts-editor-modal" onMouseDown={(event) => event.stopPropagation()} ref={editorRef} role="dialog" tabIndex={-1}>
        <div className="workflow-panel-header workflow-editor-header">
          <div className="stack">
            <span className="eyebrow">{selectedId ? "Edit account" : "Create account"}</span>
            <strong>{selectedId ?? "New account row"}</strong>
          </div>
          <button
            aria-label="Close account editor"
            className="modal-close-button"
            data-initial-focus
            onClick={() => void closeEditor()}
            title="Close account editor"
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined">close</span>
          </button>
        </div>
          <div className="workflow-editor-body">
            {selectedRow ? (
              <section className="stat-strip" aria-label="Account summary">
                <article className="stat-card">
                  <span className="eyebrow">Status</span>
                  <strong>{selectedRow.status}</strong>
                  <p className="lede">Type: {selectedRow.type}</p>
                </article>
                <article className="stat-card">
                  <span className="eyebrow">Current balance</span>
                  <strong><FinancialValue animate={false} value={selectedRow.current_balance || "0"} /></strong>
                  <p className="lede">
                    Pending withdrawal: <FinancialValue animate={false} value={selectedRow.pending_withdrawal_amount || "0"} />
                  </p>
                </article>
                <article className="stat-card">
                  <span className="eyebrow">Cash total</span>
                  <strong>{selectedRow.counts_in_cash_total ? "Included" : "Excluded"}</strong>
                  <p className="lede">
                    Last update:{" "}
                    {selectedRow.last_balance_update
                      ? formatDisplayDate(selectedRow.last_balance_update)
                      : "—"}
                  </p>
                </article>
              </section>
            ) : null}
            <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
          <label className="field-control">
            <span>Account</span>
            {selectedId ? (
              <input aria-readonly="true" readOnly value={formState.account} />
            ) : (
              <select
                aria-label="Account"
                onChange={(event) => {
                  const entry = availableMasterAccounts.find(
                    (record) => record.catalogue_id === event.target.value
                  );
                  const bookmaker = entry?.account_type === "Bookmaker"
                    ? bookmakerCatalogue.find(
                        (record) => record.brand_name === entry.brand_name
                      )
                    : undefined;
                  setFormState((current) => ({
                    ...current,
                    catalogue_id: entry?.catalogue_id ?? "",
                    bookmaker_id: bookmaker?.bookmaker_id ?? "",
                    account: entry?.brand_name ?? "",
                    type: entry?.account_type === "Bookmaker" ? "Bookie" : entry?.account_type ?? "",
                    channel: entry
                      ? entry.operating_channels.map((channel) => ({
                          web: "Online",
                          mobile: "Mobile",
                          retail: "Retail",
                        })[channel]).join(", ") || "Unknown"
                      : "Unknown",
                    group_name: entry?.operator_group ?? "",
                    platform: entry?.platform ?? "",
                    commission_rate: entry?.account_type === "Exchange"
                      ? exchangeCommissions.find(
                          (commission) => commission.exchange_name === entry.brand_name
                        )?.commission_rate ?? ""
                      : "",
                  }));
                }}
                required
                value={formState.catalogue_id}
              >
                <option value="">Select account</option>
                {(["Bookmaker", "Exchange", "Bank"] as const).map((accountType) => (
                  <optgroup key={accountType} label={`${accountType}s`}>
                    {availableMasterAccounts
                      .filter((option) => option.account_type === accountType)
                      .map((option) => (
                        <option key={option.catalogue_id} value={option.catalogue_id}>
                          {option.brand_name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            )}
          </label>
          <label className="field-control">
            <span>Type</span>
            <input aria-readonly="true" placeholder="Inherited from Account Catalogue" readOnly value={resolvedAccountType} />
          </label>
          <label className="field-control">
            <span>Lifecycle</span>
            <select
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  status: event.target.value,
                  lifecycle_status: event.target.value,
                }))
              }
              value={formState.lifecycle_status}
            >
              {accountLifecycleOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          {!selectedId && formState.type === "Exchange" ? (
            <label className="field-control">
              <span>Exchange Commission</span>
              <input
                aria-label="Exchange commission"
                inputMode="decimal"
                max="1"
                min="0"
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    commission_rate: event.target.value,
                  }))
                }
                placeholder="0.02"
                required
                step="0.001"
                type="number"
                value={formState.commission_rate}
              />
            </label>
          ) : null}
          {!isBankAccount ? <section className="field-span-2 account-editor-choice-section" aria-labelledby="account-restrictions-title">
            <span className="field-label" id="account-restrictions-title">Restrictions</span>
            <div className="review-chip-row account-restriction-choices" role="group" aria-label="Account restrictions">
              {accountRestrictionOptions.map((option) => (
                <button
                  aria-pressed={formState.restrictions.includes(option)}
                  className={`review-chip${formState.restrictions.includes(option) ? " is-active" : ""}`}
                  key={option}
                  onClick={() =>
                      setFormState((current) => ({
                        ...current,
                        restrictions: current.restrictions.includes(option)
                          ? current.restrictions.filter((value) => value !== option)
                          : [...current.restrictions, option],
                      }))
                  }
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
          </section> : null}
          {!isBankAccount ? <section className="field-span-2 account-editor-choice-section" aria-labelledby="account-offers-title">
            <span className="field-label" id="account-offers-title">Available Offers</span>
            {selectedOfferActions.length ? (
              <div className="review-chip-row" aria-label="Available account offers">
                {selectedOfferActions.map((action) => (
                  <span
                    className={`review-chip${action.availability === "limited" ? " is-warning" : " is-active"}`}
                    key={`${action.preset_id}:${action.ledger_type}`}
                    title={action.availability_reason || `${action.ledger_type} Quick Action`}
                  >
                    {action.label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="field-support-text">No configured offer actions currently target this account.</p>
            )}
          </section> : null}
          <label className="field-control">
            <span>Current balance</span>
            <FinancialTextInput
              ariaLabel="Current balance"
              dataPdId="accounts.editor.current-balance"
              id="account-current-balance"
              onBlur={() => setFormState((current) => ({ ...current, current_balance: normalizedFinancialInput(current.current_balance) }))}
              onChange={(value) => setFormState((current) => ({ ...current, current_balance: value }))}
              value={formState.current_balance}
              valueTone={financialInputTone(formState.current_balance)}
            />
          </label>
          <label className="field-control">
            <span>Pending withdrawal</span>
            <FinancialTextInput
              ariaLabel="Pending withdrawal"
              dataPdId="accounts.editor.pending-withdrawal"
              id="account-pending-withdrawal"
              onBlur={() => setFormState((current) => ({ ...current, pending_withdrawal_amount: normalizedFinancialInput(current.pending_withdrawal_amount) }))}
              onChange={(value) => setFormState((current) => ({ ...current, pending_withdrawal_amount: value }))}
              value={formState.pending_withdrawal_amount}
              valueTone={financialInputTone(formState.pending_withdrawal_amount)}
            />
          </label>
          <MaterialDateTimeField
            dataPdId="accounts.editor.last-balance-update"
            label="Last balance update"
            onChange={(value) => setFormState((current) => ({ ...current, last_balance_update: value }))}
            value={formState.last_balance_update}
          />
          <MaterialDateField
            dataPdId="accounts.editor.sign-up-date"
            label="Sign-up date"
            onChange={(value) => setFormState((current) => ({ ...current, sign_up_date: value }))}
            value={formState.sign_up_date}
          />
          <label className="field-control">
            <span>Counts in cash total</span>
            <select
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  counts_in_cash_total: event.target.value === "true",
                }))
              }
              value={String(formState.counts_in_cash_total)}
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="field-control">
            <span>Group</span>
            <input aria-readonly="true" readOnly value={selectedProvider?.operator_group || formState.group_name || "Inherited from account catalogue"} />
          </label>
          <label className="field-control">
            <span>Platform</span>
            <input aria-readonly="true" readOnly value={selectedProvider?.platform || formState.platform || "Inherited from account catalogue"} />
          </label>
          <label className="field-control field-span-2">
            <span>Notes</span>
            <textarea
              onChange={(event) =>
                setFormState((current) => ({ ...current, notes: event.target.value }))
              }
              rows={3}
              value={formState.notes}
            />
          </label>
              {errorMessage ? <p className="field-span-2 error-text" role="alert">{errorMessage}</p> : null}
              <div className="field-span-2 workflow-editor-footer" data-pd-id="accounts.editor.footer">
                <div className="workflow-editor-footer-primary">
                <button className="modal-primary-button" disabled={isPending || isSaving || isArchiving} type="submit">
                  {isSaving ? <span aria-hidden="true" className="button-spinner" /> : null}
                  <span>{isSaving ? "Saving" : selectedId ? "Save" : "Create"}</span>
                </button>
                {selectedRow ? (
                  <button className="button-link destructive-action" disabled={isPending || isSaving || isArchiving} onClick={() => setIsArchiveConfirmationOpen(true)} type="button">
                    <span aria-hidden="true" className="material-symbols-outlined">archive</span>
                    <span>Remove from Profile</span>
                  </button>
                ) : null}
                <button className="review-chip" disabled={isPending || isSaving || isArchiving} onClick={handleResetForm} type="button">Revert</button>
                <button className="review-chip" disabled={isPending || isSaving || isArchiving} onClick={() => void closeEditor()} type="button">Cancel</button>
                </div>
              </div>
            </form>
          </div>
      </section>
            </div>,
            document.body,
          )
        : null}
      <ConfirmationDialog
        busy={isArchiving}
        confirmLabel="Remove from Profile"
        description={`${selectedRow?.account ?? "This account"} will be archived for this Profile. Historical records will be retained.`}
        onCancel={() => setIsArchiveConfirmationOpen(false)}
        onConfirm={() => void archiveSelectedAccount()}
        open={isArchiveConfirmationOpen}
        title="Remove Account?"
      />
    </section>
  );
}
