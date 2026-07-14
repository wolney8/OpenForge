"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { apiBaseUrl } from "@/lib/api";
import { StatusToast } from "@/components/status-toast";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "@/lib/date-format";
import {
  scrollToElementTopAfterRender,
  usePersistedBoolean,
  useToastDismiss,
  useTrackerRouteReselect,
} from "@/lib/ledger-ui";
import { getLookupValuesByType, type LookupValueRecord } from "@/lib/lookup-values";
import type { TableColumn } from "@/lib/tracker-modules";
import { formatDisplayDate } from "@/lib/tracker-summary";
import { filterTrackerRows, getTrackerPageCount, paginateTrackerRows } from "@/lib/tracker-table";
import type { TrackerRow } from "@/lib/tracker-types";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import {
  accountChannelOptions,
  accountStatusOptions,
  accountTypeOptions,
  dedupeOptions,
} from "@/lib/workbook-options";
import { formatMoney } from "@/lib/tracker-summary";

type AccountRecord = {
  account_id: string;
  profile_id: string;
  account: string;
  type: string;
  counts_in_cash_total: boolean;
  channel: string;
  status: string;
  current_balance: string;
  pending_withdrawal_amount: string;
  last_balance_update: string;
  group_name: string;
  platform: string;
  created_at: string;
  updated_at: string;
};

type AccountFormState = {
  account_id?: string;
  account: string;
  type: string;
  counts_in_cash_total: boolean;
  channel: string;
  status: string;
  current_balance: string;
  pending_withdrawal_amount: string;
  last_balance_update: string;
  group_name: string;
  platform: string;
};

type AccountTableMode =
  | "All"
  | "Active"
  | "Limited / Gubbed"
  | "Bookie"
  | "Exchange"
  | "Bank"
  | "Cash total";

const accountTableModes: Array<{ label: string; value: AccountTableMode }> = [
  { label: "All", value: "All" },
  { label: "Active", value: "Active" },
  { label: "Limited / Gubbed", value: "Limited / Gubbed" },
  { label: "Bookie", value: "Bookie" },
  { label: "Exchange", value: "Exchange" },
  { label: "Bank", value: "Bank" },
  { label: "Cash total", value: "Cash total" },
];

const tableColumns: TableColumn[] = [
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
];

function createBlankForm(): AccountFormState {
  return {
    account: "",
    type: "Bookie",
    counts_in_cash_total: true,
    channel: "Unknown",
    status: "Active",
    current_balance: "",
    pending_withdrawal_amount: "",
    last_balance_update: "",
    group_name: "",
    platform: "",
  };
}

function recordToForm(record: AccountRecord): AccountFormState {
  return {
    account_id: record.account_id,
    account: record.account,
    type: record.type,
    counts_in_cash_total: record.counts_in_cash_total,
    channel: record.channel,
    status: record.status,
    current_balance: record.current_balance,
    pending_withdrawal_amount: record.pending_withdrawal_amount,
    last_balance_update: toDateTimeLocalValue(record.last_balance_update),
    group_name: record.group_name,
    platform: record.platform,
  };
}

function parseAmount(value: string) {
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function AccountsWorkflowShell({ profileId }: { profileId: string }) {
  const [rows, setRows] = useState<AccountRecord[]>([]);
  const [lookupValues, setLookupValues] = useState<LookupValueRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workflowVisible, setWorkflowVisible] = useState(false);
  const [editorExpanded, setEditorExpanded] = useState(true);
  const [tableCollapsed, setTableCollapsed] = usePersistedBoolean(
    `openforge-ledger-collapsed:${profileId}:accounts`,
    false
  );
  const [formState, setFormState] = useState<AccountFormState>(createBlankForm);
  const [pristineFormState, setPristineFormState] = useState<AccountFormState>(createBlankForm);
  const [tableMode, setTableMode] = useState<AccountTableMode>("All");
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const editorRef = useRef<HTMLElement | null>(null);
  const isCreatingDraftRef = useRef(false);
  const pageSize = 10;
  const isDirty = useMemo(
    () => JSON.stringify(formState) !== JSON.stringify(pristineFormState),
    [formState, pristineFormState]
  );
  const confirmDiscardChanges = useUnsavedChangesGuard(isDirty);
  const clearStatusMessage = useCallback(() => setStatusMessage(""), []);

  useToastDismiss(statusMessage, clearStatusMessage);

  const revealEditor = useCallback(
    (options?: { expandLedger?: boolean }) => {
      setEditorExpanded(true);
      if (options?.expandLedger ?? true) {
        setTableCollapsed(false);
      }
      scrollToElementTopAfterRender(() => editorRef.current);
    },
    [setTableCollapsed]
  );

  useTrackerRouteReselect(() => {
    setTableCollapsed(false);
    setEditorExpanded(true);
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
        fetch(`${apiBaseUrl}/profiles/${profileId}/lookup-values`, { cache: "no-store" }).then(
          async (response) => {
            if (!response.ok) {
              throw new Error("Unable to load workbook authority lists");
            }
            setLookupValues((await response.json()) as LookupValueRecord[]);
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

  const accountOptions = useMemo(
    () => dedupeOptions([...rows.map((row) => row.account), formState.account]),
    [formState.account, rows]
  );

  const groupOptions = useMemo(
    () =>
      dedupeOptions([
        ...getLookupValuesByType(lookupValues, "group"),
        ...rows.map((row) => row.group_name),
        formState.group_name,
      ]),
    [formState.group_name, lookupValues, rows]
  );

  const platformOptions = useMemo(
    () =>
      dedupeOptions([
        ...getLookupValuesByType(lookupValues, "platform"),
        ...rows.map((row) => row.platform),
        formState.platform,
      ]),
    [formState.platform, lookupValues, rows]
  );

  const accountQuickView = useMemo(() => {
    const activeAccounts = rows.filter((row) => row.status === "Active").length;
    const restrictedAccounts = rows.filter((row) =>
      ["Limited", "Gubbed", "Inactive"].includes(row.status)
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
      case "Limited / Gubbed":
        return rows.filter((row) => ["Limited", "Gubbed", "Inactive"].includes(row.status));
      case "Bookie":
      case "Exchange":
      case "Bank":
        return rows.filter((row) => row.type === tableMode);
      case "Cash total":
        return rows.filter((row) => row.counts_in_cash_total);
      case "All":
      default:
        return rows;
    }
  }, [rows, tableMode]);

  const filteredRows = useMemo(() => {
    const tableRows: TrackerRow[] = reviewRows.map((row) => ({
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
    }));
    return filterTrackerRows(tableRows, tableColumns, query);
  }, [query, reviewRows]);

  const pageCount = getTrackerPageCount(filteredRows.length, pageSize);
  const effectivePage = Math.min(currentPage, pageCount);
  const pagedRows = useMemo(
    () => paginateTrackerRows(filteredRows, effectivePage, pageSize),
    [effectivePage, filteredRows]
  );

  function selectRow(rowId: string, options?: { collapseTable?: boolean }) {
    if (rowId !== selectedId && isDirty && !confirmDiscardChanges()) {
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
    setEditorExpanded(true);
    setTableCollapsed(Boolean(options?.collapseTable));
    revealEditor({ expandLedger: !options?.collapseTable });
    setStatusMessage(`Opened account ${rowId} for editing.`);
  }

  function startNewRow() {
    if (isDirty && !confirmDiscardChanges()) {
      return;
    }
    setSelectedId(null);
    isCreatingDraftRef.current = true;
    setWorkflowVisible(true);
    const blankForm = createBlankForm();
    setFormState(blankForm);
    setPristineFormState(blankForm);
    setErrorMessage("");
    setEditorExpanded(true);
    revealEditor({ expandLedger: true });
    setStatusMessage("New account ready. Complete the required fields, then save.");
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
        <div className="sportsbook-page-header">
          <h1 className="sportsbook-page-title">Accounts</h1>
          <div className="tracker-nav">
            <button className="button-link" onClick={startNewRow} type="button">
              Add account row
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
        <section className="stat-strip" aria-label="Account quick view">
          <article className="stat-card">
            <span className="eyebrow">Active accounts</span>
            <strong>{accountQuickView.activeAccounts}</strong>
            <p className="lede">Restricted {accountQuickView.restrictedAccounts}</p>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Cash-included balance</span>
            <strong>{formatMoney(accountQuickView.cashIncludedBalance)}</strong>
            <p className="lede">Accounts counted in cash total {accountQuickView.cashTotalCount}</p>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Pending withdrawals</span>
            <strong>{formatMoney(accountQuickView.pendingWithdrawals)}</strong>
            <p className="lede">Across all tracked account rows for this profile.</p>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Type mix</span>
            <strong>
              {accountQuickView.bookieCount} / {accountQuickView.exchangeCount} /{" "}
              {accountQuickView.bankCount}
            </strong>
            <p className="lede">Bookie / Exchange / Bank</p>
          </article>
        </section>
        {!tableCollapsed ? (
          <>
            <div className="sportsbook-review-bar" aria-label="Accounts review filters">
              <div className="review-chip-row" role="group" aria-label="Accounts review modes">
                {accountTableModes.map((mode) => (
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
              <label className="field-control table-search-field">
                <span>Search</span>
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
            </div>
            {errorMessage ? (
              <p className="error-text" role="alert">
                {errorMessage}
              </p>
            ) : null}
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    {tableColumns.map((column) => (
                      <th
                        className={column.align === "end" ? "align-end" : undefined}
                        key={column.key}
                        scope="col"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length === 0 ? (
                    <tr>
                      <td className="empty-cell" colSpan={tableColumns.length}>
                        No account rows match the current filter.
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((row, index) => {
                      const rowId = String(row.account_id);
                      return (
                        <tr
                          className={selectedId === rowId ? "is-selected-row" : undefined}
                          key={`${rowId}-${index}`}
                          onClick={() => selectRow(rowId)}
                          onDoubleClick={() => selectRow(rowId, { collapseTable: true })}
                        >
                          {tableColumns.map((column) => (
                            <td
                              className={column.align === "end" ? "align-end" : undefined}
                              key={column.key}
                            >
                              {row[column.key] || "—"}
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="table-pagination" aria-label="Accounts pagination">
              <div className="table-status">
                {tableMode} • Page {effectivePage} of {pageCount}
              </div>
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

      {workflowVisible ? (
      <section className="content-panel stack workflow-editor-panel" ref={editorRef}>
        <div className="workflow-panel-header">
          <div className="stack">
            <span className="eyebrow">{selectedId ? "Edit account" : "Create account"}</span>
            <strong>{selectedId ?? "New account row"}</strong>
          </div>
          <button
            aria-expanded={editorExpanded}
            aria-label={editorExpanded ? "Collapse account form" : "Expand account form"}
            className="icon-button ledger-collapse-button"
            onClick={() => setEditorExpanded((current) => !current)}
            title={editorExpanded ? "Collapse account form" : "Expand account form"}
            type="button"
          >
            {editorExpanded ? "-" : "+"}
          </button>
        </div>
        {editorExpanded ? (
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
            <select
              onChange={(event) =>
                setFormState((current) => ({ ...current, account: event.target.value }))
              }
              required
              value={formState.account}
            >
              <option value="">Select account</option>
              {accountOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="field-control">
            <span>Type</span>
            <select
              onChange={(event) =>
                setFormState((current) => ({ ...current, type: event.target.value }))
              }
              value={formState.type}
            >
              {accountTypeOptions.map((option) => (
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
                setFormState((current) => ({ ...current, status: event.target.value }))
              }
              value={formState.status}
            >
              {accountStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="field-control">
            <span>Channel</span>
            <select
              onChange={(event) =>
                setFormState((current) => ({ ...current, channel: event.target.value }))
              }
              value={formState.channel}
            >
              {accountChannelOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
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
            <select
              onChange={(event) =>
                setFormState((current) => ({ ...current, group_name: event.target.value }))
              }
              value={formState.group_name}
            >
              <option value="">Select group</option>
              {groupOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="field-control">
            <span>Platform</span>
            <select
              onChange={(event) =>
                setFormState((current) => ({ ...current, platform: event.target.value }))
              }
              value={formState.platform}
            >
              <option value="">Select platform</option>
              {platformOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
              <div className="tracker-nav field-span-2">
                <button className="button-link" disabled={isPending} type="submit">
                  {selectedId ? "Save account row" : "Create account row"}
                </button>
                <button className="button-link" onClick={handleResetForm} type="button">
                  {selectedId ? "Revert changes" : "Reset form"}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </section>
      ) : null}
    </section>
  );
}
