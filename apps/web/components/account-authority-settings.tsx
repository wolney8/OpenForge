"use client";

import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { FinancialTextInput } from "@/components/financial-text-input";
import { LedgerPagination } from "@/components/ledger-pagination";
import { LedgerTableScroll } from "@/components/ledger-table-scroll";
import { apiBaseUrl } from "@/lib/api";
import { formatApiErrorBody } from "@/lib/api-error";
import type {
  MasterAccountCatalogue,
  MasterAccountCatalogueRecord,
  MasterAccountType,
} from "@/lib/bookmaker-catalogue";

type ProfileAccount = {
  account_id: string;
  catalogue_id: string | null;
  account: string;
  type: "Bookie" | "Exchange" | "Bank";
  status: string;
  lifecycle_status: string;
  current_balance: string;
  counts_in_cash_total: boolean;
};

type ExchangeCommission = {
  exchange_name: string;
  commission_rate: string;
};

type AccountDraft = {
  status: string;
  currentBalance: string;
  commissionRate: string;
  countsInCashTotal: boolean;
};

type ColumnKey = "provider" | "type" | "status" | "balance" | "commission" | "actions";
type SortKey = "provider" | "type" | "status";

const accountStatuses = [
  "Not Signed Up",
  "Pending Sign Up",
  "Active",
  "Bonus Restricted",
  "Limited",
  "Gubbed",
  "Blocked",
  "Not Using",
  "Closed",
] as const;

const columns: Array<{ key: ColumnKey; label: string }> = [
  { key: "provider", label: "Provider" },
  { key: "type", label: "Type" },
  { key: "status", label: "Profile Status" },
  { key: "balance", label: "Opening / Current Balance" },
  { key: "commission", label: "Exchange Commission" },
  { key: "actions", label: "Actions" },
];

const initialColumnWidths: Record<ColumnKey, number> = {
  provider: 280,
  type: 150,
  status: 230,
  balance: 230,
  commission: 210,
  actions: 210,
};

function normalizeTwoDecimals(value: string): string {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed.toFixed(2) : value;
}

function isValidCommission(value: string): boolean {
  const normalized = value.trim();
  if (!normalized || !/^\d*(?:\.\d*)?$/.test(normalized)) return false;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1;
}

function isSelected(account: ProfileAccount | undefined): boolean {
  return Boolean(
    account && account.status !== "Archived" && account.lifecycle_status !== "Archived",
  );
}

export function AccountAuthoritySettings({ profileId }: { profileId: string }) {
  const [catalogue, setCatalogue] = useState<MasterAccountCatalogueRecord[]>([]);
  const [accounts, setAccounts] = useState<ProfileAccount[]>([]);
  const [drafts, setDrafts] = useState<Record<string, AccountDraft>>({});
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<MasterAccountType | "All">("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "provider",
    direction: "asc",
  });
  const [columnWidths, setColumnWidths] = useState(initialColumnWidths);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const loadRows = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const [catalogueResponse, accountsResponse, commissionsResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/account-catalogue/source`, { cache: "no-store" }),
        fetch(`${apiBaseUrl}/profiles/${profileId}/accounts`, { cache: "no-store" }),
        fetch(`${apiBaseUrl}/profiles/${profileId}/exchange-commissions`, {
          cache: "no-store",
        }),
      ]);
      if (!catalogueResponse.ok || !accountsResponse.ok || !commissionsResponse.ok) {
        throw new Error("Unable to load the Profile Account Catalogue choices.");
      }
      const cataloguePayload = (await catalogueResponse.json()) as MasterAccountCatalogue;
      const accountPayload = (await accountsResponse.json()) as ProfileAccount[];
      const commissionPayload = (await commissionsResponse.json()) as ExchangeCommission[];
      const activeGbProviders = cataloguePayload.records.filter(
        (record) =>
          record.status === "Active" && record.operating_jurisdictions.includes("GB"),
      );
      const commissionByName = new Map(
        commissionPayload.map((record) => [record.exchange_name, record.commission_rate]),
      );
      const accountByCatalogueId = new Map(
        accountPayload
          .filter((account) => account.catalogue_id)
          .map((account) => [account.catalogue_id as string, account]),
      );
      setCatalogue(activeGbProviders);
      setAccounts(accountPayload);
      setDrafts(
        Object.fromEntries(
          activeGbProviders.map((record) => {
            const account = accountByCatalogueId.get(record.catalogue_id);
            return [
              record.catalogue_id,
              {
                status: isSelected(account) ? account!.status : "Not Signed Up",
                currentBalance: account?.current_balance || "0.00",
                commissionRate: commissionByName.get(record.brand_name) || "",
                countsInCashTotal: account?.counts_in_cash_total ?? true,
              },
            ];
          }),
        ),
      );
      setStatusMessage(
        `${activeGbProviders.length} active GB providers are available from the Fund Manager Account Catalogue.`,
      );
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRows().catch((error: Error) => setErrorMessage(error.message));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadRows]);

  const accountByCatalogueId = useMemo(
    () => new Map(
      accounts
        .filter((account) => account.catalogue_id)
        .map((account) => [account.catalogue_id as string, account]),
    ),
    [accounts],
  );
  const activeExchangeCount = useMemo(
    () => accounts.filter((account) => account.type === "Exchange" && isSelected(account)).length,
    [accounts],
  );
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("en-GB");
    return catalogue
      .filter((record) =>
        (typeFilter === "All" || record.account_type === typeFilter) &&
        (!normalizedQuery || [
          record.brand_name,
          record.operator_group,
          record.platform,
          record.catalogue_id,
        ].join(" ").toLocaleLowerCase("en-GB").includes(normalizedQuery)),
      )
      .sort((left, right) => {
        const leftAccount = accountByCatalogueId.get(left.catalogue_id);
        const rightAccount = accountByCatalogueId.get(right.catalogue_id);
        const leftValue = sort.key === "provider"
          ? left.brand_name
          : sort.key === "type"
            ? left.account_type
            : leftAccount?.status ?? "Not Signed Up";
        const rightValue = sort.key === "provider"
          ? right.brand_name
          : sort.key === "type"
            ? right.account_type
            : rightAccount?.status ?? "Not Signed Up";
        const comparison = leftValue.localeCompare(rightValue, "en-GB", { numeric: true });
        return sort.direction === "asc" ? comparison : -comparison;
      });
  }, [accountByCatalogueId, catalogue, query, sort, typeFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const effectivePage = Math.min(page, pageCount);
  const visibleRows = filteredRows.slice(
    (effectivePage - 1) * pageSize,
    effectivePage * pageSize,
  );

  function updateDraft(catalogueId: string, values: Partial<AccountDraft>) {
    setDrafts((current) => ({
      ...current,
      [catalogueId]: { ...current[catalogueId], ...values },
    }));
  }

  function toggleSort(key: SortKey) {
    setSort((current) => current.key === key
      ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
      : { key, direction: "asc" });
    setPage(1);
  }

  const startColumnResize = useCallback((
    event: ReactMouseEvent<HTMLSpanElement>,
    key: ColumnKey,
    headerCell: HTMLTableCellElement | null,
  ) => {
    event.preventDefault();
    const startX = event.clientX;
    const initialWidth = headerCell?.getBoundingClientRect().width ?? columnWidths[key];
    const onMove = (moveEvent: MouseEvent) => {
      setColumnWidths((current) => ({
        ...current,
        [key]: Math.max(120, Math.round(initialWidth + moveEvent.clientX - startX)),
      }));
    };
    const onEnd = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
  }, [columnWidths]);

  async function saveSelection(record: MasterAccountCatalogueRecord, selected: boolean) {
    const draft = drafts[record.catalogue_id];
    if (!draft) return;
    if (selected && record.account_type === "Exchange" && !isValidCommission(draft.commissionRate)) {
      setErrorMessage("Enter an Exchange commission as a decimal fraction from 0 to 1.");
      return;
    }
    setSavingId(record.catalogue_id);
    setErrorMessage("");
    try {
      const response = await fetch(
        `${apiBaseUrl}/profiles/${profileId}/accounts/catalogue-selection/${record.catalogue_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selected,
            status: selected ? draft.status : "Archived",
            current_balance: draft.currentBalance,
            counts_in_cash_total: draft.countsInCashTotal,
            commission_rate: record.account_type === "Exchange"
              ? draft.commissionRate.trim() || null
              : null,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(formatApiErrorBody(
          await response.text(),
          `Unable to ${selected ? "save" : "archive"} ${record.brand_name}.`,
        ));
      }
      await loadRows();
      setStatusMessage(
        `${record.brand_name} was ${selected ? "saved to" : "archived from"} this Profile.`,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update the Profile account.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <section
      aria-label="Profile Account Catalogue settings"
      className="content-panel stack"
      data-pd-id="profile-settings.accounts"
    >
      <div><span className="eyebrow">Profile account availability</span><h2>Choose Accounts</h2></div>
      <div className="table-toolbar settings-table-toolbar">
        <label className="field-control table-search-field">
          <span>Search Accounts</span>
          <input aria-label="Search Profile Account Catalogue" onChange={(event) => { setQuery(event.target.value); setPage(1); }} type="search" value={query} />
        </label>
        <div className="settings-table-filter-group">
          <label className="field-control table-filter-field">
            <span>Account Type</span>
            <select onChange={(event) => { setTypeFilter(event.target.value as MasterAccountType | "All"); setPage(1); }} value={typeFilter}>
              <option>All</option><option>Bookmaker</option><option>Exchange</option><option>Bank</option>
            </select>
          </label>
        </div>
      </div>
      {statusMessage ? <div aria-live="polite" className="table-status">{statusMessage}</div> : null}
      {errorMessage ? <p className="error-text" role="alert">{errorMessage}</p> : null}
      {loading ? <p aria-live="polite">Loading Account Catalogue…</p> : (
        <>
          <LedgerPagination ariaLabel="Profile Account Catalogue" currentPage={effectivePage} onPageChange={setPage} onPageSizeChange={(nextSize) => { setPageSize(nextSize); setPage(1); }} pageCount={pageCount} pageSize={pageSize} position="top" totalRows={filteredRows.length} />
          <LedgerTableScroll dataPdId="profile-settings.accounts.table">
            <table className="data-table profile-account-authority-table">
              <colgroup>{columns.map((column) => <col key={column.key} style={{ width: `${columnWidths[column.key]}px` }} />)}</colgroup>
              <thead><tr>{columns.map((column) => {
                const sortable = ["provider", "type", "status"].includes(column.key);
                const activeSort = sortable && sort.key === column.key;
                return <th aria-sort={sortable ? activeSort ? sort.direction === "asc" ? "ascending" : "descending" : "none" : undefined} key={column.key} scope="col"><div className="table-header-cell">{sortable ? <button className={`table-sort-button${activeSort ? " is-active" : ""}`} onClick={() => toggleSort(column.key as SortKey)} type="button"><span>{column.label}</span><span aria-hidden="true">{activeSort ? sort.direction === "asc" ? "▲" : "▼" : "↕"}</span></button> : <span className="table-header-label">{column.label}</span>}<span aria-hidden="true" className="table-column-resize-handle" onMouseDown={(event) => startColumnResize(event, column.key, event.currentTarget.closest("th"))} /></div></th>;
              })}</tr></thead>
              <tbody>{visibleRows.length ? visibleRows.map((record) => {
                const account = accountByCatalogueId.get(record.catalogue_id);
                const selected = isSelected(account);
                const draft = drafts[record.catalogue_id];
                const saving = savingId === record.catalogue_id;
                const lastExchange = selected && record.account_type === "Exchange" && activeExchangeCount <= 1;
                return <tr key={record.catalogue_id}>
                  <td><span className="profile-onboarding-provider-cell"><span className="account-brand-pill" style={{ backgroundColor: record.background_colour, color: record.foreground_colour }}>{record.brand_name}</span><span className="table-status">{record.operator_group || record.platform || "Global catalogue"}</span></span></td>
                  <td><span className="table-chip table-chip-muted">{record.account_type}</span></td>
                  <td><label className="field-control table-inline-control"><span className="sr-only">{record.brand_name} Profile status</span><select aria-label={`${record.brand_name} Profile status`} disabled={saving} onChange={(event) => updateDraft(record.catalogue_id, { status: event.target.value })} value={draft?.status ?? "Not Signed Up"}>{accountStatuses.map((status) => <option key={status}>{status}</option>)}</select></label></td>
                  <td><label className="field-control table-inline-control"><span className="sr-only">{record.brand_name} Profile balance</span><FinancialTextInput ariaLabel={`${record.brand_name} Profile balance`} dataPdId={`profile-settings.account.${record.catalogue_id}.balance`} id={`profile-settings-account-${record.catalogue_id}-balance`} onBlur={() => updateDraft(record.catalogue_id, { currentBalance: normalizeTwoDecimals(draft?.currentBalance ?? "0") })} onChange={(value) => updateDraft(record.catalogue_id, { currentBalance: value })} value={draft?.currentBalance ?? "0.00"} /></label></td>
                  <td>{record.account_type === "Exchange" ? <label className="field-control table-inline-control"><span className="sr-only">{record.brand_name} commission</span><input aria-invalid={!isValidCommission(draft?.commissionRate ?? "")} aria-label={`${record.brand_name} commission`} inputMode="decimal" max="1" min="0" onChange={(event) => updateDraft(record.catalogue_id, { commissionRate: event.target.value })} placeholder="0.02" step="0.001" type="number" value={draft?.commissionRate ?? ""} /></label> : "—"}</td>
                  <td><div className="tracker-nav"><button className="modal-primary-button compact-action" disabled={saving || !draft || (record.account_type === "Exchange" && !isValidCommission(draft.commissionRate))} onClick={() => void saveSelection(record, true)} type="button">{saving ? <span aria-hidden="true" className="button-spinner" /> : null}<span>{selected ? "Save" : "Add"}</span></button>{selected ? <button aria-label={`Archive ${record.brand_name}`} className="icon-button icon-button-destructive" disabled={saving || lastExchange} onClick={() => void saveSelection(record, false)} title={lastExchange ? "A Profile must retain at least one Exchange" : `Archive ${record.brand_name}`} type="button"><span aria-hidden="true" className="material-symbols-outlined">archive</span></button> : null}</div></td>
                </tr>;
              }) : <tr><td className="empty-cell" colSpan={columns.length}>No GB providers match the current filters.</td></tr>}</tbody>
            </table>
          </LedgerTableScroll>
          <LedgerPagination ariaLabel="Profile Account Catalogue" currentPage={effectivePage} onPageChange={setPage} onPageSizeChange={(nextSize) => { setPageSize(nextSize); setPage(1); }} pageCount={pageCount} pageSize={pageSize} position="bottom" totalRows={filteredRows.length} />
        </>
      )}
    </section>
  );
}
