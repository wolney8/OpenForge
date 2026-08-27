"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { apiBaseUrl } from "@/lib/api";
import { BookmakerIdentity } from "@/components/bookmaker-identity";
import { FinancialValue } from "@/components/financial-value";
import { LedgerAddRowButton } from "@/components/ledger-add-row-button";
import { LedgerPagination } from "@/components/ledger-pagination";
import { LedgerTableScroll } from "@/components/ledger-table-scroll";
import { StatusToast } from "@/components/status-toast";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "@/lib/date-format";
import {
  scrollToElementTopAfterRender,
  useBodyScrollLock,
  useDialogFocusLifecycle,
  usePersistedBoolean,
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
  accountTypeOptions,
  dedupeOptions,
} from "@/lib/workbook-options";
import type {
  BookmakerCatalogueRecord,
  MasterAccountCatalogue,
  MasterAccountCatalogueRecord,
  MasterAccountOperatingContext,
  MasterAccountType,
} from "@/lib/bookmaker-catalogue";
import { getAvailableMasterAccountNames } from "@/lib/bookmaker-catalogue";

type AccountRecord = {
  account_id: string;
  profile_id: string;
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
    bookmaker_id: "",
    account: "",
    type: "Bookie",
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
  };
}

function recordToForm(record: AccountRecord): AccountFormState {
  return {
    account_id: record.account_id,
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
  };
}

function parseAmount(value: string) {
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseChannels(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
  const [masterAccountContext, setMasterAccountContext] = useState<MasterAccountOperatingContext>({
    jurisdiction: "",
    subdivision: "",
    channels: [],
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workflowVisible, setWorkflowVisible] = useState(false);
  const [tableCollapsed, setTableCollapsed] = usePersistedBoolean(
    `openforge-ledger-collapsed:${profileId}:accounts`,
    false
  );
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
  const [isPending, startTransition] = useTransition();
  const editorRef = useRef<HTMLElement | null>(null);
  const filterDialogRef = useRef<HTMLElement | null>(null);
  const isCreatingDraftRef = useRef(false);
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
            const nextFormState = recordToForm(activeRecord);
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
            setMasterAccountContext(catalogue.default_operating_context);
          }
        ),
      ]).catch((error: Error) => {
        setErrorMessage(error.message);
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadRows, profileId]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.account_id === selectedId) ?? null,
    [rows, selectedId]
  );

  const accountOptions = useMemo(() => {
    const sourceType: MasterAccountType =
      formState.type === "Exchange"
        ? "Exchange"
        : formState.type === "Bank"
          ? "Bank"
          : "Bookmaker";
    return dedupeOptions([
      ...getAvailableMasterAccountNames(masterAccountCatalogue, sourceType, masterAccountContext),
      formState.account,
    ]);
  }, [formState.account, formState.type, masterAccountCatalogue, masterAccountContext]);

  const selectableBookmakers = useMemo(
    () =>
      bookmakerCatalogue.filter(
        (row) => row.status === "Active" || row.bookmaker_id === formState.bookmaker_id
      ),
    [bookmakerCatalogue, formState.bookmaker_id]
  );

  const accountQuickView = useMemo(() => {
    const activeAccounts = rows.filter((row) => row.status === "Active").length;
    const restrictedAccounts = rows.filter((row) =>
      ["Bonus Restricted", "Limited", "Gubbed", "Inactive"].includes(row.status)
    ).length;
    const cashTotalAccounts = rows.filter((row) => row.counts_in_cash_total);
    const cashIncludedBalance = cashTotalAccounts.reduce(
      (sum, row) => sum + parseAmount(row.current_balance),
      0
    );
    const pendingWithdrawals = rows.reduce(
      (sum, row) => sum + parseAmount(row.pending_withdrawal_amount),
      0
    );
    const bookieCount = rows.filter((row) => row.type === "Bookie").length;
    const exchangeCount = rows.filter((row) => row.type === "Exchange").length;
    const bankCount = rows.filter((row) => row.type === "Bank").length;

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
  }, [rows]);

  const reviewRows = useMemo(() => {
    switch (tableMode) {
      case "Active":
        return rows.filter((row) => row.status === "Active");
      case "Not Signed Up":
        return rows.filter(
          (row) => row.status === "Not Signed Up" || row.lifecycle_status === "Not Signed Up"
        );
      case "Limited / Gubbed":
        return rows.filter((row) =>
          ["Bonus Restricted", "Limited", "Gubbed", "Inactive"].includes(row.status)
        );
      case "Bookie":
      case "Exchange":
      case "Bank":
        return rows.filter((row) => row.type === tableMode);
      case "Cash total":
        return rows.filter((row) => row.counts_in_cash_total);
      case "Recent":
        return [...rows].sort((left, right) =>
          Date.parse(right.updated_at || right.created_at) - Date.parse(left.updated_at || left.created_at)
        );
      case "All":
      default:
        return rows;
    }
  }, [rows, tableMode]);

  const accountFilterOptions = useMemo(
    () => ({
      statuses: dedupeOptions(rows.map((row) => row.status)),
      restrictions: dedupeOptions(rows.flatMap((row) => row.restrictions)),
      channels: dedupeOptions(rows.map((row) => row.channel)),
    }),
    [rows]
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

  async function selectRow(rowId: string, options?: { collapseTable?: boolean }) {
    if (rowId !== selectedId && isDirty && !(await confirmDiscardChanges())) {
      return;
    }
    const record = rows.find((entry) => entry.account_id === rowId);
    if (!record) {
      return;
    }
    setSelectedId(rowId);
    isCreatingDraftRef.current = false;
    setWorkflowVisible(true);
    const nextFormState = recordToForm(record);
    setFormState(nextFormState);
    setPristineFormState(nextFormState);
    setErrorMessage("");
    setTableCollapsed(Boolean(options?.collapseTable));
    revealEditor({ expandLedger: !options?.collapseTable });
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
    revealEditor({ expandLedger: true });
    setStatusMessage("");
  }

  function handleResetForm() {
    if (selectedRow) {
      const nextFormState = recordToForm(selectedRow);
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
    setTableCollapsed(false);
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
    setTableCollapsed(false);
    setErrorMessage("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    const isEditing = Boolean(selectedId);
    const url = isEditing
      ? `${apiBaseUrl}/profiles/${profileId}/accounts/${selectedId}`
      : `${apiBaseUrl}/profiles/${profileId}/accounts`;
    const method = isEditing ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formState,
        status: formState.lifecycle_status,
        last_balance_update: fromDateTimeLocalValue(formState.last_balance_update),
      }),
    });

    if (!response.ok) {
      setErrorMessage(await response.text());
      return;
    }

    const saved = (await response.json()) as AccountRecord;
    isCreatingDraftRef.current = false;
    await loadRows(null);
    setWorkflowVisible(false);
    setTableCollapsed(false);
    setStatusMessage(
      isEditing
        ? `Updated account ${saved.account_id}.`
        : `Created account ${saved.account_id}.`
    );
  }

  return (
    <section className="stack">
      <StatusToast message={statusMessage} onDismiss={clearStatusMessage} />
      <section className="content-panel stack sportsbook-page-shell">
        <div className="sportsbook-page-header accounts-page-header">
          <h1 className="sportsbook-page-title">Accounts</h1>
        </div>
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
            <strong><FinancialValue value={rows.filter((row) => row.type === "Bookie").reduce((sum, row) => sum + parseAmount(row.current_balance), 0)} /></strong>
            <p className="lede">Profile bookmaker cash</p>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Exchange balances</span>
            <strong><FinancialValue value={rows.filter((row) => row.type === "Exchange").reduce((sum, row) => sum + parseAmount(row.current_balance), 0)} /></strong>
            <p className="lede">Profile exchange cash</p>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Pending withdrawals</span>
            <strong><FinancialValue value={accountQuickView.pendingWithdrawals} /></strong>
            <p className="lede">Across all tracked account rows for this profile.</p>
          </article>
        </section>
        {!tableCollapsed ? (
          <>
            <div
              aria-label="Accounts controls"
              className="sportsbook-review-bar accounts-review-toolbar"
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
              <div className="extra-place-toolbar-actions accounts-review-actions">
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
            <div className="extra-place-table-heading-controls accounts-table-heading-controls">
              <div className="tracker-nav extra-place-loadouts accounts-review-loadouts" role="group" aria-label="Accounts review modes">
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
                      return (
                        <tr
                          className={selectedId === rowId ? "is-selected-row" : undefined}
                          key={rowId}
                          onClick={() => void selectRow(rowId)}
                          onDoubleClick={() => void selectRow(rowId, { collapseTable: true })}
                        >
                          {visibleTableColumns.map((column) => (
                            <td
                              className={column.align === "end" ? "align-end" : undefined}
                              key={column.key}
                            >
                              {column.key === "account" && String(row.type) === "Bookie" ? (
                                <BookmakerIdentity
                                  bookmaker={String(row.account ?? "")}
                                  catalogue={bookmakerCatalogue}
                                  mode="Brand badge"
                                />
                              ) : column.key === "type" || column.key === "status" ? (
                                <span className="table-chip table-chip-muted">{String(row[column.key] || "—")}</span>
                              ) : column.key === "current_balance" || column.key === "pending_withdrawal_amount" ? (
                                <span className="table-chip accounts-financial-chip"><FinancialValue animate={false} tone="neutral" value={String(row[column.key] || "0")} /></span>
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
        ) : null}
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
                  <strong>{selectedRow.current_balance || "—"}</strong>
                  <p className="lede">
                    Pending withdrawal: {selectedRow.pending_withdrawal_amount || "—"}
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
            ) : formState.type === "Bookie" ? (
              <select
                onChange={(event) => {
                  const entry = bookmakerCatalogue.find(
                    (row) => row.bookmaker_id === event.target.value
                  );
                  setFormState((current) => ({
                    ...current,
                    bookmaker_id: entry?.bookmaker_id ?? "",
                    account: entry?.brand_name ?? "",
                    group_name: entry?.operator_group ?? "",
                    platform: entry?.platform ?? "",
                  }));
                }}
                required
                value={formState.bookmaker_id}
              >
                <option value="">Select bookmaker</option>
                {selectableBookmakers.map((option) => (
                  <option key={option.bookmaker_id} value={option.bookmaker_id}>
                    {option.brand_name}{option.status === "Archived" ? " (Archived)" : ""}
                  </option>
                ))}
              </select>
            ) : (
              <select
                onChange={(event) => {
                  const account = event.target.value;
                  const expectedType: MasterAccountType = formState.type === "Exchange" ? "Exchange" : "Bank";
                  const entry = masterAccountCatalogue.find(
                    (candidate) => candidate.account_type === expectedType && candidate.brand_name === account
                  );
                  setFormState((current) => ({
                    ...current,
                    account,
                    group_name: entry?.operator_group ?? "",
                    platform: entry?.platform ?? "",
                  }));
                }}
                required
                value={formState.account}
              >
                <option value="">Select account</option>
                {accountOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            )}
          </label>
          <label className="field-control">
            <span>Type</span>
            {selectedId ? <input aria-readonly="true" readOnly value={formState.type} /> : <select
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  type: event.target.value,
                  account: "",
                  bookmaker_id: "",
                  group_name: "",
                  platform: "",
                }))
              }
              value={formState.type}
            >
              {accountTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>}
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
          <section className="field-span-2 account-editor-choice-section" aria-labelledby="account-restrictions-title">
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
          </section>
          <label className="field-control">
            <span>Current balance</span>
            <input
              inputMode="decimal"
              onChange={(event) =>
                setFormState((current) => ({ ...current, current_balance: event.target.value }))
              }
              value={formState.current_balance}
            />
          </label>
          <label className="field-control">
            <span>Pending withdrawal</span>
            <input
              inputMode="decimal"
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  pending_withdrawal_amount: event.target.value,
                }))
              }
              value={formState.pending_withdrawal_amount}
            />
          </label>
          <label className="field-control">
            <span>Last balance update</span>
            <input
              type="datetime-local"
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  last_balance_update: event.target.value,
                }))
              }
              value={formState.last_balance_update}
            />
          </label>
          <label className="field-control">
            <span>Sign-up date</span>
            <input
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  sign_up_date: event.target.value,
                }))
              }
              type="date"
              value={formState.sign_up_date}
            />
          </label>
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
            <input aria-readonly="true" readOnly value={formState.group_name || "Inherited from account catalogue"} />
          </label>
          <label className="field-control">
            <span>Platform</span>
            <input aria-readonly="true" readOnly value={formState.platform || "Inherited from account catalogue"} />
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
              <div className="field-span-2 workflow-editor-footer" data-pd-id="accounts.editor.footer">
                <div className="workflow-editor-footer-primary">
                <button className="review-chip review-chip-copy" disabled={isPending} type="submit">
                  {selectedId ? "Save" : "Create"}
                </button>
                <button className="review-chip" disabled={isPending} onClick={handleResetForm} type="button">Revert</button>
                <button className="review-chip" disabled={isPending} onClick={() => void closeEditor()} type="button">Cancel</button>
                </div>
              </div>
            </form>
          </div>
      </section>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
