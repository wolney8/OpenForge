"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { LedgerPagination } from "@/components/ledger-pagination";
import { LedgerTableScroll } from "@/components/ledger-table-scroll";
import { StatusToast } from "@/components/status-toast";
import { apiBaseUrl } from "@/lib/api";
import type {
  MasterAccountCatalogue,
  MasterAccountCatalogueRecord,
  MasterAccountChannel,
  MasterAccountType,
} from "@/lib/bookmaker-catalogue";

const defaultPageSize = 8;
const accountLogoPrefix = "/account-logos/";
const accountTypes: MasterAccountType[] = ["Bookmaker", "Exchange", "Bank"];
const channels: MasterAccountChannel[] = ["web", "mobile", "retail"];

type ImportPreflightResult = {
  incoming_record_count: number;
  current_record_count: number;
  added_catalogue_ids: string[];
  updated_catalogue_ids: string[];
  removed_catalogue_ids: string[];
};

function createBlankRecord(): MasterAccountCatalogueRecord {
  return {
    catalogue_id: "",
    account_type: "Bookmaker",
    operating_jurisdictions: ["GB"],
    operating_subdivisions: [],
    operating_channels: ["web", "mobile"],
    brand_name: "",
    short_display_name: "",
    legal_operator: "",
    operator_group: "",
    platform: "",
    risk_team: "",
    licence_reference: "",
    licence_status: "",
    canonical_domain: "",
    status: "Active",
    foreground_colour: "#FFFFFF",
    background_colour: "#455A64",
    logo_asset_path: "",
    source: "Fund Manager entry",
    confidence: "Unverified",
    last_verified_date: "",
    evidence: [],
  };
}

function splitCodes(value: string): string[] {
  return [...new Set(value.split(",").map((entry) => entry.trim().toUpperCase()).filter(Boolean))];
}

function generatedCatalogueId(accountType: MasterAccountType, brandName: string): string {
  const slug = brandName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${accountType.toUpperCase()}-${slug}`;
}

function responseError(body: string): string {
  try {
    const parsed = JSON.parse(body) as { detail?: string };
    return parsed.detail ?? body;
  } catch {
    return body;
  }
}

export function MasterAccountCatalogueSettings() {
  const [catalogue, setCatalogue] = useState<MasterAccountCatalogue | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MasterAccountCatalogueRecord | null>(null);
  const [draft, setDraft] = useState<MasterAccountCatalogueRecord>(createBlankRecord);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<MasterAccountType | "All">("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Archived">("All");
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: "type" | "brand" | "status"; direction: "asc" | "desc" }>({ key: "brand", direction: "asc" });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const openButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const [importPreflight, setImportPreflight] = useState<ImportPreflightResult | null>(null);

  const loadCatalogue = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/account-catalogue/source`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(responseError(await response.text()));
      }
      setCatalogue((await response.json()) as MasterAccountCatalogue);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCatalogue().catch((error: Error) => setErrorMessage(error.message));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadCatalogue]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    closeButtonRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) {
        setEditingRecord(null);
        setIsOpen(false);
        window.setTimeout(() => openButtonRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, isSaving]);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("en-GB");
    return (catalogue?.records ?? []).filter((record) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          record.brand_name,
          record.short_display_name,
          record.legal_operator,
          record.operator_group,
          record.platform,
          record.risk_team,
          record.catalogue_id,
        ]
          .join(" ")
          .toLocaleLowerCase("en-GB")
          .includes(normalizedQuery);
      return (
        matchesQuery &&
        (typeFilter === "All" || record.account_type === typeFilter) &&
        (statusFilter === "All" || record.status === statusFilter)
      );
    });
  }, [catalogue, query, statusFilter, typeFilter]);

  const sortedRecords = useMemo(() => [...filteredRecords].sort((left, right) => {
    const value = sort.key === "type"
      ? left.account_type.localeCompare(right.account_type)
      : sort.key === "status"
        ? left.status.localeCompare(right.status)
        : left.brand_name.localeCompare(right.brand_name);
    return sort.direction === "asc" ? value : -value;
  }), [filteredRecords, sort]);
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const visibleRecords = sortedRecords.slice((page - 1) * pageSize, page * pageSize);

  function toggleSort(key: "type" | "brand" | "status") {
    setSort((current) => current.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" });
    setPage(1);
  }

  function closeCatalogue() {
    if (isSaving) {
      return;
    }
    setEditingRecord(null);
    setIsOpen(false);
    window.setTimeout(() => openButtonRef.current?.focus(), 0);
  }

  function beginAdd() {
    setDraft(createBlankRecord());
    setEditingRecord(createBlankRecord());
    setErrorMessage("");
    setIsOpen(true);
  }

  function beginEdit(record: MasterAccountCatalogueRecord) {
    setDraft(structuredClone(record));
    setEditingRecord(record);
    setErrorMessage("");
    setIsOpen(true);
  }

  async function preflightImport(file: File | undefined) {
    if (!file) return;
    setErrorMessage("");
    setImportPreflight(null);
    try {
      const catalogue = JSON.parse(await file.text()) as MasterAccountCatalogue;
      const response = await fetch(`${apiBaseUrl}/account-catalogue/source/import/preflight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalogue }),
      });
      if (!response.ok) throw new Error(responseError(await response.text()));
      setImportPreflight((await response.json()) as ImportPreflightResult);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to validate catalogue file.");
    } finally {
      if (importFileRef.current) importFileRef.current.value = "";
    }
  }

  async function saveRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const isNew = !editingRecord?.catalogue_id;
    const payload = {
      ...draft,
      catalogue_id:
        draft.catalogue_id || generatedCatalogueId(draft.account_type, draft.brand_name),
      short_display_name: draft.short_display_name || draft.brand_name,
    };
    setIsSaving(true);
    setErrorMessage("");
    try {
      const response = await fetch(
        isNew
          ? `${apiBaseUrl}/account-catalogue/source/records`
          : `${apiBaseUrl}/account-catalogue/source/records/${editingRecord.catalogue_id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        throw new Error(responseError(await response.text()));
      }
      await loadCatalogue();
      setEditingRecord(null);
      setStatusMessage(`${payload.brand_name} ${isNew ? "added" : "updated"}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save account.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleArchive(record: MasterAccountCatalogueRecord) {
    setIsSaving(true);
    setErrorMessage("");
    const nextStatus = record.status === "Active" ? "Archived" : "Active";
    try {
      const response = await fetch(
        `${apiBaseUrl}/account-catalogue/source/records/${record.catalogue_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...record, status: nextStatus }),
        }
      );
      if (!response.ok) {
        throw new Error(responseError(await response.text()));
      }
      await loadCatalogue();
      setEditingRecord(null);
      setStatusMessage(`${record.brand_name} marked ${nextStatus.toLocaleLowerCase("en-GB")}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update account.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="content-panel stack" aria-labelledby="master-account-catalogue-title" data-pd-id="account-catalogue.section">
      <StatusToast message={statusMessage} onDismiss={() => setStatusMessage("")} />
      <div className="sportsbook-page-header">
        <div>
          <span className="eyebrow">Universal authority</span>
          <h2 id="master-account-catalogue-title">Account Catalogue</h2>
        </div>
      </div>
      <section className="stat-strip settings-stat-strip" aria-label="Account Catalogue summary">
        {accountTypes.map((accountType) => (
          <article className="stat-card" key={accountType}>
            <span>{accountType === "Bookmaker" ? "Bookmakers" : `${accountType}s`}</span>
            <strong>{catalogue?.records.filter((record) => record.account_type === accountType).length ?? 0}</strong>
            <small>Global providers</small>
          </article>
        ))}
        <article className="stat-card"><span>Active Providers</span><strong>{catalogue?.records.filter((record) => record.status === "Active").length ?? 0}</strong><small>Available to profiles</small></article>
      </section>
      {errorMessage && !isOpen ? <p className="error-text" role="alert">{errorMessage}</p> : null}
      {isLoading && !catalogue ? <LedgerLoadingIndicator label="Loading Account Catalogue" /> : null}
      <div className="table-toolbar settings-table-toolbar account-catalogue-toolbar" data-pd-id="account-catalogue.controls">
        <label className="field-control table-search-field"><span>Search accounts</span><input aria-label="Search Account Catalogue" data-pd-id="account-catalogue.search" onChange={(event) => { setQuery(event.target.value); setPage(1); }} type="search" value={query} /></label>
        <div className="settings-table-filter-group"><label className="field-control table-filter-field"><span>Account type</span><select data-pd-id="account-catalogue.type-filter" onChange={(event) => { setTypeFilter(event.target.value as MasterAccountType | "All"); setPage(1); }} value={typeFilter}><option>All</option>{accountTypes.map((accountType) => <option key={accountType}>{accountType}</option>)}</select></label><label className="field-control table-filter-field"><span>Status</span><select data-pd-id="account-catalogue.status-filter" onChange={(event) => { setStatusFilter(event.target.value as "All" | "Active" | "Archived"); setPage(1); }} value={statusFilter}><option>All</option><option>Active</option><option>Archived</option></select></label><a className="button-link" download href={`${apiBaseUrl}/account-catalogue/source/export.json`}>Export</a><input accept="application/json" aria-label="Choose account catalogue JSON file to validate" className="sr-only" onChange={(event) => void preflightImport(event.target.files?.[0])} ref={importFileRef} type="file" /><button className="button-link" onClick={() => importFileRef.current?.click()} type="button">Check catalogue import</button><button className="modal-primary-button icon-text-action" data-pd-id="account-catalogue.add" onClick={beginAdd} ref={openButtonRef} type="button"><span aria-hidden="true" className="material-symbols-outlined">add</span><span>Add Account</span></button></div>
      </div>
      <p className="field-hint account-catalogue-import-help">Check catalogue import validates a catalogue JSON against the current global providers. It reports added, updated and missing providers; it never changes Profile accounts or replaces the catalogue.</p>
      {importPreflight ? <section aria-live="polite" className="content-subpanel stack"><strong>Import check passed</strong><span>{importPreflight.incoming_record_count} incoming records; {importPreflight.current_record_count} current.</span><span>Added {importPreflight.added_catalogue_ids.length} · Updated {importPreflight.updated_catalogue_ids.length} · Missing {importPreflight.removed_catalogue_ids.length}</span></section> : null}
      <LedgerPagination ariaLabel="Account Catalogue" currentPage={page} onPageChange={setPage} onPageSizeChange={(nextSize) => { setPageSize(nextSize); setPage(1); }} pageCount={totalPages} pageSize={pageSize} position="top" totalRows={sortedRecords.length} />
      <LedgerTableScroll dataPdId="account-catalogue.table-scroll">
        <table className="data-table account-catalogue-table"><thead><tr>
          {([['type', 'Type'], ['brand', 'Brand']] as const).map(([key, label]) => <th aria-sort={sort.key === key ? sort.direction === "asc" ? "ascending" : "descending" : "none"} key={key}><button className={`table-sort-button${sort.key === key ? " is-active" : ""}`} onClick={() => toggleSort(key)} type="button">{label}<span aria-hidden="true" className="material-symbols-outlined">{sort.key === key && sort.direction === "desc" ? "arrow_downward" : "arrow_upward"}</span></button></th>)}
          <th>Operator Details</th><th>Availability</th><th aria-sort={sort.key === "status" ? sort.direction === "asc" ? "ascending" : "descending" : "none"}><button className={`table-sort-button${sort.key === "status" ? " is-active" : ""}`} onClick={() => toggleSort("status")} type="button">Status<span aria-hidden="true" className="material-symbols-outlined">{sort.key === "status" && sort.direction === "desc" ? "arrow_downward" : "arrow_upward"}</span></button></th><th>Actions</th>
        </tr></thead><tbody>{visibleRecords.map((record) => <tr key={record.catalogue_id}><td><span className="table-chip table-chip-muted">{record.account_type}</span></td><td><span className="account-brand-pill" data-pd-id="account-catalogue.brand-pill" style={{ backgroundColor: record.background_colour, color: record.foreground_colour }}>{record.brand_name}</span></td><td><span>{record.operator_group || "No group"}</span><span className="table-status">{record.platform || "No platform"}</span></td><td>{record.operating_jurisdictions.join(", ") || "Unverified"}<span className="table-status">{record.operating_channels.join(", ") || "No verified channels"}</span></td><td><span className={`table-chip ${record.status === "Active" ? "table-chip-status-placed" : "table-chip-muted"}`}>{record.status}</span></td><td><div className="tracker-nav account-catalogue-actions"><button aria-label={`Edit ${record.brand_name}`} className="icon-button" onClick={() => beginEdit(record)} type="button"><span aria-hidden="true" className="material-symbols-outlined">edit</span></button></div></td></tr>)}</tbody></table>
      </LedgerTableScroll>
      <LedgerPagination ariaLabel="Account Catalogue" currentPage={page} onPageChange={setPage} onPageSizeChange={(nextSize) => { setPageSize(nextSize); setPage(1); }} pageCount={totalPages} pageSize={pageSize} position="bottom" totalRows={sortedRecords.length} />

      {isOpen && editingRecord && typeof document !== "undefined" ? createPortal((
        <div
          className="modal-backdrop"
          data-pd-id="account-catalogue.dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCatalogue();
          }}
        >
          <section
            aria-labelledby="account-catalogue-dialog-title"
            aria-modal="true"
            className="modal-panel workflow-editor-modal account-catalogue-modal"
            data-pd-id="account-catalogue.dialog"
            role="dialog"
          >
            <header className="modal-sticky-header sportsbook-page-header">
              <div>
                <span className="eyebrow">Fund Manager Settings</span>
                <h2 id="account-catalogue-dialog-title">
                  {editingRecord ? (editingRecord.catalogue_id ? "Edit Account" : "Add Account") : "Account Catalogue"}
                </h2>
              </div>
              <button
                aria-label="Close Account Catalogue"
                className="modal-close-button"
                data-pd-id="account-catalogue.close"
                disabled={isSaving}
                onClick={closeCatalogue}
                ref={closeButtonRef}
                type="button"
              >
                <span aria-hidden="true" className="material-symbols-outlined">close</span>
              </button>
            </header>

            {errorMessage ? <p className="error-text" role="alert">{errorMessage}</p> : null}

            {editingRecord ? (
              <AccountCatalogueForm
                draft={draft}
                isNew={!editingRecord.catalogue_id}
                isSaving={isSaving}
                key={editingRecord.catalogue_id || "new-account"}
                onBack={() => setEditingRecord(null)}
                onChange={setDraft}
                onSubmit={saveRecord}
                onToggleArchive={() => void toggleArchive(editingRecord)}
              />
            ) : (
              <>
                <div className="tracker-nav account-catalogue-transfer-actions">
                  <a className="button-link" download href={`${apiBaseUrl}/account-catalogue/source/export.json`}>
                    Export catalogue
                  </a>
                  <input
                    accept="application/json"
                    aria-label="Choose account catalogue JSON file to validate"
                    className="sr-only"
                    onChange={(event) => void preflightImport(event.target.files?.[0])}
                    ref={importFileRef}
                    type="file"
                  />
                  <button className="button-link" onClick={() => importFileRef.current?.click()} type="button">
                    Check catalogue import
                  </button>
                </div>
                <p className="lede account-catalogue-import-help">
                  Validates a catalogue JSON against the current global providers. It reports added, updated and missing providers only; it never changes Profile accounts or applies a catalogue replacement.
                </p>
                {importPreflight ? (
                  <section aria-live="polite" className="content-subpanel stack">
                    <strong>Import check passed</strong>
                    <span>{importPreflight.incoming_record_count} incoming records; {importPreflight.current_record_count} current.</span>
                    <span>Added {importPreflight.added_catalogue_ids.length} · Updated {importPreflight.updated_catalogue_ids.length} · Missing {importPreflight.removed_catalogue_ids.length}</span>
                    <p className="lede">No changes have been applied. A confirmed, audited replacement workflow is required before bulk catalogue changes.</p>
                  </section>
                ) : null}
                <div className="account-catalogue-toolbar">
                  <label className="field-control table-search-field">
                    <span>Search accounts</span>
                    <input
                      aria-label="Search Account Catalogue"
                      data-pd-id="account-catalogue.search"
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setPage(1);
                      }}
                      type="search"
                      value={query}
                    />
                  </label>
                  <label className="field-control table-filter-field">
                    <span>Account type</span>
                    <select
                      data-pd-id="account-catalogue.type-filter"
                      onChange={(event) => {
                        setTypeFilter(event.target.value as MasterAccountType | "All");
                        setPage(1);
                      }}
                      value={typeFilter}
                    >
                      <option>All</option>
                      {accountTypes.map((accountType) => <option key={accountType}>{accountType}</option>)}
                    </select>
                  </label>
                  <label className="field-control table-filter-field">
                    <span>Status</span>
                    <select
                      data-pd-id="account-catalogue.status-filter"
                      onChange={(event) => {
                        setStatusFilter(event.target.value as "All" | "Active" | "Archived");
                        setPage(1);
                      }}
                      value={statusFilter}
                    >
                      <option>All</option><option>Active</option><option>Archived</option>
                    </select>
                  </label>
                </div>
                <div className="table-scroll account-catalogue-table-scroll" data-pd-id="account-catalogue.table-scroll">
                  <table className="data-table account-catalogue-table">
                    <thead>
                      <tr><th>Type</th><th>Brand</th><th>Operator Details</th><th>Availability</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {visibleRecords.map((record) => (
                        <tr key={record.catalogue_id}>
                          <td><span className="table-chip table-chip-muted">{record.account_type}</span></td>
                          <td>
                            <span
                              className="account-brand-pill"
                              data-pd-id="account-catalogue.brand-pill"
                              style={{ backgroundColor: record.background_colour, color: record.foreground_colour }}
                            >
                              {record.brand_name}
                            </span>
                          </td>
                          <td><span>{record.operator_group || "No group"}</span><span className="table-status">{record.platform || "No platform"}</span></td>
                          <td>{record.operating_jurisdictions.join(", ") || "Unverified"}<span className="table-status">{record.operating_channels.join(", ") || "No verified channels"}</span></td>
                          <td><span className={`table-chip ${record.status === "Active" ? "table-chip-status-placed" : "table-chip-muted"}`}>{record.status}</span></td>
                          <td>
                            <div className="tracker-nav account-catalogue-actions">
                              <button aria-label={`Edit ${record.brand_name}`} className="icon-button" onClick={() => beginEdit(record)} type="button"><span aria-hidden="true" className="material-symbols-outlined">edit</span></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <footer className="modal-sticky-footer">
                  <span className="table-status">{filteredRecords.length} accounts · Page {page} of {totalPages}</span>
                  <div className="tracker-nav">
                    <button className="button-link" data-pd-id="account-catalogue.add" onClick={beginAdd} type="button">Add Account</button>
                    <button className="button-link" disabled={page === 1} onClick={() => setPage((current) => current - 1)} type="button">Previous</button>
                    <button className="button-link" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)} type="button">Next</button>
                  </div>
                </footer>
              </>
            )}
            {isLoading ? <LedgerLoadingIndicator label="Refreshing Account Catalogue" /> : null}
          </section>
        </div>
      ), document.body) : null}
    </section>
  );
}

function AccountCatalogueForm({
  draft,
  isNew,
  isSaving,
  onBack,
  onChange,
  onSubmit,
  onToggleArchive,
}: {
  draft: MasterAccountCatalogueRecord;
  isNew: boolean;
  isSaving: boolean;
  onBack: () => void;
  onChange: React.Dispatch<React.SetStateAction<MasterAccountCatalogueRecord>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onToggleArchive: () => void;
}) {
  function update<K extends keyof MasterAccountCatalogueRecord>(key: K, value: MasterAccountCatalogueRecord[K]) {
    onChange((current) => ({ ...current, [key]: value }));
  }

  return (
    <form className="account-catalogue-form" data-pd-id="account-catalogue.form" onSubmit={onSubmit}>
      <div className="form-grid account-catalogue-form-grid">
        <label className="field-control"><span>Account type</span><select disabled={!isNew} onChange={(event) => update("account_type", event.target.value as MasterAccountType)} value={draft.account_type}>{accountTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label className="field-control"><span>Catalogue ID</span><input onChange={(event) => update("catalogue_id", event.target.value.toUpperCase())} placeholder="Generated from brand when blank" readOnly={!isNew} value={draft.catalogue_id} /></label>
        <label className="field-control"><span>Brand name</span><input required onChange={(event) => update("brand_name", event.target.value)} value={draft.brand_name} /></label>
        <label className="field-control"><span>Short display name</span><input maxLength={32} onChange={(event) => update("short_display_name", event.target.value)} value={draft.short_display_name} /></label>
        <CodeListField
          helpId="account-catalogue-country-help"
          helpText="ISO country codes separated by commas, for example GB, IE."
          label="Operating countries"
          onCommit={(values) => update("operating_jurisdictions", values)}
          values={draft.operating_jurisdictions}
        />
        <CodeListField
          label="Operating subdivisions"
          onCommit={(values) => update("operating_subdivisions", values)}
          values={draft.operating_subdivisions}
        />
        <fieldset className="field-control account-channel-fieldset"><legend>Operating channels</legend><div className="tracker-nav">{channels.map((channel) => <label className="checkbox-control" key={channel}><input checked={draft.operating_channels.includes(channel)} onChange={(event) => update("operating_channels", event.target.checked ? [...draft.operating_channels, channel] : draft.operating_channels.filter((value) => value !== channel))} type="checkbox" /><span>{channel}</span></label>)}</div></fieldset>
        <div className="field-control account-lifecycle-summary">
          <span>Lifecycle status</span>
          <div className="account-static-field">
            <span className={`table-chip ${draft.status === "Active" ? "table-chip-status-placed" : "table-chip-muted"}`}>{draft.status}</span>
          </div>
        </div>
        {([
          ["legal_operator", "Legal operator"], ["operator_group", "Operator group"], ["platform", "Platform"], ["risk_team", "Risk team"],
          ["licence_reference", "Licence reference"], ["licence_status", "Licence status"], ["canonical_domain", "Canonical domain"],
          ["source", "Source"],
        ] as Array<[keyof MasterAccountCatalogueRecord, string]>).map(([key, label]) => (
          <label className="field-control" key={key}><span>{label}</span><input onChange={(event) => update(key, event.target.value as never)} type={key === "canonical_domain" ? "url" : "text"} value={String(draft[key])} /></label>
        ))}
        <LogoAssetPathField onChange={(value) => update("logo_asset_path", value)} value={draft.logo_asset_path} />
        <label className="field-control"><span>Confidence</span><select onChange={(event) => update("confidence", event.target.value as MasterAccountCatalogueRecord["confidence"])} value={draft.confidence}>{draft.confidence === "Verified" ? <option>Verified</option> : null}<option>Likely</option><option>Unverified</option></select></label>
        <label className="field-control"><span>Last verified date</span><input onChange={(event) => update("last_verified_date", event.target.value)} type="date" value={draft.last_verified_date} /></label>
        <fieldset className="account-colour-fieldset">
          <legend>Brand colours</legend>
          <div className="account-colour-controls">
            <BrandColourControl label="Text colour" onChange={(value) => update("foreground_colour", value)} value={draft.foreground_colour} />
            <BrandColourControl label="Background colour" onChange={(value) => update("background_colour", value)} value={draft.background_colour} />
            <output className="account-colour-preview" style={{ background: draft.background_colour, color: draft.foreground_colour }}>{draft.brand_name || "Brand preview"}</output>
          </div>
        </fieldset>
      </div>
      {draft.evidence.length ? <p className="table-status">{draft.evidence.length} verified evidence source{draft.evidence.length === 1 ? "" : "s"} retained.</p> : null}
      <footer className="modal-sticky-footer">
        <div className="tracker-nav">
          <button className="button-link" disabled={isSaving} onClick={onBack} type="button">Back to Catalogue</button>
          {!isNew ? <button className={draft.status === "Active" ? "danger-button" : "button-link"} data-pd-id="account-catalogue.archive" disabled={isSaving} onClick={onToggleArchive} type="button">{draft.status === "Active" ? "Archive Account" : "Restore Account"}</button> : null}
        </div>
        <button className="modal-primary-button" disabled={isSaving} type="submit">
          {isSaving ? <span aria-hidden="true" className="button-spinner" /> : null}
          <span>{isSaving ? "Saving Account" : isNew ? "Add Account" : "Save Account"}</span>
        </button>
      </footer>
    </form>
  );
}

function LogoAssetPathField({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const filename = value.startsWith(accountLogoPrefix)
    ? value.slice(accountLogoPrefix.length)
    : value.replace(/^\/+/, "");

  function updateFilename(nextValue: string) {
    const normalizedFilename = nextValue
      .trimStart()
      .replace(/^\/?account-logos\//i, "")
      .replace(/^\/+/, "");
    onChange(normalizedFilename ? `${accountLogoPrefix}${normalizedFilename}` : "");
  }

  return (
    <label className="field-control">
      <span>Local logo file</span>
      <span className="prefixed-field-control">
        <span aria-hidden="true" className="prefixed-field-prefix">{accountLogoPrefix}</span>
        <input
          aria-describedby="account-catalogue-logo-help"
          aria-label="Local logo filename"
          data-pd-id="account-catalogue.logo-filename"
          maxLength={200}
          onChange={(event) => updateFilename(event.target.value)}
          placeholder="smarkets.svg"
          spellCheck={false}
          value={filename}
        />
      </span>
      <small id="account-catalogue-logo-help">Add the file to apps/web/public/account-logos. SVG, PNG and WebP are supported.</small>
    </label>
  );
}

function BrandColourControl({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const [hexValue, setHexValue] = useState(value);
  const isValid = /^#[0-9A-F]{6}$/i.test(hexValue);

  function updateHex(nextValue: string) {
    const normalized = nextValue.trim().toUpperCase();
    setHexValue(normalized);
    if (/^#[0-9A-F]{6}$/.test(normalized)) {
      onChange(normalized);
    }
  }

  return (
    <div className="brand-colour-control">
      <span className="brand-colour-label">{label}</span>
      <div className="brand-colour-inputs">
        <label className="brand-colour-picker">
          <span className="visually-hidden">Pick {label.toLocaleLowerCase("en-GB")}</span>
          <input
            aria-label={`Pick ${label.toLocaleLowerCase("en-GB")}`}
            onChange={(event) => updateHex(event.target.value)}
            type="color"
            value={value}
          />
        </label>
        <label className={`field-control brand-colour-hex${isValid ? "" : " is-invalid"}`}>
          <span className="visually-hidden">{label} hex</span>
          <input
            aria-invalid={!isValid}
            aria-label={`${label} hex`}
            inputMode="text"
            maxLength={7}
            onBlur={() => {
              if (!isValid) setHexValue(value);
            }}
            onChange={(event) => updateHex(event.target.value)}
            placeholder="#RRGGBB"
            spellCheck={false}
            value={hexValue}
          />
        </label>
      </div>
    </div>
  );
}

function CodeListField({
  helpId,
  helpText,
  label,
  onCommit,
  values,
}: {
  helpId?: string;
  helpText?: string;
  label: string;
  onCommit: (values: string[]) => void;
  values: string[];
}) {
  const [textValue, setTextValue] = useState(values.join(", "));

  return (
    <label className="field-control">
      <span>{label}</span>
      <input
        aria-describedby={helpId}
        onBlur={() => {
          const normalized = splitCodes(textValue);
          setTextValue(normalized.join(", "));
          onCommit(normalized);
        }}
        onChange={(event) => setTextValue(event.target.value)}
        value={textValue}
      />
      {helpText ? <small id={helpId}>{helpText}</small> : null}
    </label>
  );
}
