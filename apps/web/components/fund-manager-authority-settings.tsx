"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiBaseUrl } from "@/lib/api";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { StatusToast } from "@/components/status-toast";

type AuthorityRow = {
  lookup_value_id: string;
  lookup_type: string;
  option_value: string;
  status: "Active" | "Archived";
  sort_order: number;
};

const authorityLabels: Record<string, string> = {
  offer_name: "Sportsbook and free-bet offer names",
  casino_offer_name: "Casino offer names",
  offer_type: "Offer types",
  bet_type: "Bet types",
  fixture_type: "Fixture types",
  strategy: "Strategies",
  sportsbook_status: "Sportsbook statuses",
  free_bet_status: "Free-bet statuses",
  casino_status: "Casino statuses",
  account_lifecycle: "Account lifecycle",
  account_restriction: "Account restrictions",
  group: "Account groups",
  platform: "Platforms",
  risk_team: "Risk teams",
};

export function FundManagerAuthoritySettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [rows, setRows] = useState<AuthorityRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("offer_type");
  const [editing, setEditing] = useState<AuthorityRow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draftValue, setDraftValue] = useState("");
  const [draftType, setDraftType] = useState("offer_type");
  const [draftStatus, setDraftStatus] = useState<"Active" | "Archived">("Active");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadRows = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(apiBaseUrl + "/fund-manager/lookup-values", { cache: "no-store" });
      if (!response.ok) throw new Error("Fund Manager authorities could not be loaded.");
      setRows((await response.json()) as AuthorityRow[]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authorities could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const timeoutId = window.setTimeout(() => void loadRows(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen, loadRows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) =>
      row.lookup_type === typeFilter && (!query || row.option_value.toLowerCase().includes(query))
    );
  }, [rows, search, typeFilter]);

  function openCreate() {
    setEditing(null);
    setIsCreating(true);
    setDraftType(typeFilter);
    setDraftValue("");
    setDraftStatus("Active");
  }

  function openEdit(row: AuthorityRow) {
    setIsCreating(false);
    setEditing(row);
    setDraftType(row.lookup_type);
    setDraftValue(row.option_value);
    setDraftStatus(row.status);
  }

  async function saveAuthority() {
    const value = draftValue.trim();
    if (!value) return;
    setIsSaving(true);
    setError("");
    const url = editing
      ? apiBaseUrl + "/fund-manager/lookup-values/" + editing.lookup_value_id
      : apiBaseUrl + "/fund-manager/lookup-values";
    const response = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lookup_type: draftType,
        option_value: value,
        status: draftStatus,
        sort_order: editing?.sort_order ?? filteredRows.length,
      }),
    });
    if (!response.ok) {
      setError(await response.text());
      setIsSaving(false);
      return;
    }
    setMessage((editing ? "Updated " : "Added ") + value + ".");
    setEditing(null);
    setIsCreating(false);
    await loadRows();
    setIsSaving(false);
  }

  function closeEditor() {
    setEditing(null);
    setIsCreating(false);
  }

  return (
    <>
      <section className="content-panel stack" data-pd-id="fund-manager-authorities.section">
        <span className="eyebrow">Universal tracker authority</span>
        <h2>Tracker Lists</h2>
        <button
          className="button-link settings-card-action"
          data-pd-id="fund-manager-authorities.manage"
          onClick={() => setIsOpen(true)}
          type="button"
        >
          Manage Tracker Lists
        </button>
      </section>
      {isOpen ? (
        <div className="modal-backdrop modal-backdrop-elevated">
          <section aria-label="Manage Fund Manager tracker lists" aria-modal="true" className="modal-panel workflow-editor-modal fund-manager-settings-modal" data-pd-id="fund-manager-authorities.dialog" role="dialog">
            <header className="workflow-editor-modal-header">
              <div><span className="eyebrow">Fund Manager Settings</span><h2>Tracker Lists</h2></div>
              <button aria-label="Close tracker lists" className="modal-close-button" onClick={() => setIsOpen(false)} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button>
            </header>
            <div className="workflow-editor-modal-body stack fund-manager-authority-body">
              {isLoading ? <LedgerLoadingIndicator label="Loading tracker lists" /> : null}
              {error ? <p className="error-text" role="alert">{error}</p> : null}
              {!isLoading && !editing && !isCreating ? (
                <>
                  <div className="table-toolbar fund-manager-authority-toolbar">
                    <label className="field-control table-filter-field"><span>List</span><select data-pd-id="fund-manager-authorities.list-filter" onChange={(event) => setTypeFilter(event.target.value)} value={typeFilter}>{Object.entries(authorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                    <label className="field-control table-search-field"><span>Search</span><input aria-label="Search Fund Manager tracker list" data-pd-id="fund-manager-authorities.search" onChange={(event) => setSearch(event.target.value)} type="search" value={search} /></label>
                    <button className="button-link icon-text-action" data-pd-id="fund-manager-authorities.add" onClick={openCreate} type="button"><span aria-hidden="true" className="material-symbols-outlined">add</span><span>Add Value</span></button>
                  </div>
                  <div className="table-scroll" data-pd-id="fund-manager-authorities.table-scroll">
                    <table className="data-table"><thead><tr><th>Value</th><th>Status</th><th>Action</th></tr></thead><tbody>
                      {filteredRows.map((row) => <tr key={row.lookup_value_id}><td>{row.option_value}</td><td><span className="table-chip">{row.status}</span></td><td><button aria-label={"Edit " + row.option_value} className="icon-button" onClick={() => openEdit(row)} type="button"><span aria-hidden="true" className="material-symbols-outlined">edit</span></button></td></tr>)}
                    </tbody></table>
                  </div>
                </>
              ) : null}
              {editing || isCreating ? (
                <div className="form-grid fund-manager-authority-editor" data-pd-id="fund-manager-authorities.editor">
                  <label className="field-control"><span>List</span><select data-pd-id="fund-manager-authorities.editor.list" onChange={(event) => setDraftType(event.target.value)} value={draftType}>{Object.entries(authorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label className="field-control"><span>Value</span><input data-pd-id="fund-manager-authorities.editor.value" maxLength={120} onChange={(event) => setDraftValue(event.target.value)} value={draftValue} /></label>
                  <label className="field-control"><span>Status</span><select data-pd-id="fund-manager-authorities.editor.status" onChange={(event) => setDraftStatus(event.target.value as "Active" | "Archived")} value={draftStatus}><option>Active</option><option>Archived</option></select></label>
                </div>
              ) : null}
            </div>
            <footer className="workflow-editor-modal-footer"><button className="button-link" onClick={() => editing || isCreating ? closeEditor() : setIsOpen(false)} type="button">{editing || isCreating ? "Back to Tracker Lists" : "Close"}</button>{editing || isCreating ? <button className="modal-primary-button" data-pd-id="fund-manager-authorities.save" disabled={!draftValue.trim() || isSaving} onClick={() => void saveAuthority()} type="button">{isSaving ? "Saving" : "Save Value"}</button> : null}</footer>
          </section>
        </div>
      ) : null}
      <StatusToast message={message} onDismiss={() => setMessage("")} tone="success" />
    </>
  );
}
