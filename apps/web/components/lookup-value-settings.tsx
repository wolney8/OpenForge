"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiBaseUrl } from "@/lib/api";
import { useBodyScrollLock, useDialogFocusLifecycle } from "@/lib/ledger-ui";
import { getLookupValuesByType, type LookupValueRecord, type LookupValueType } from "@/lib/lookup-values";
import { dedupeOptions } from "@/lib/workbook-options";

const sections: Array<{ lookupType: LookupValueType; title: string; singularLabel: string }> = [
  { lookupType: "offer_name", title: "Sportsbook And Free Bet Offer Names", singularLabel: "offer name" },
  { lookupType: "casino_offer_name", title: "Casino Offer Names", singularLabel: "casino offer name" },
];

export function LookupValueSettings({ profileId }: { profileId: string }) {
  const [rows, setRows] = useState<LookupValueRecord[]>([]);
  const [activeType, setActiveType] = useState<LookupValueType | null>(null);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [statusMessage, setStatusMessage] = useState("Loading offer names...");
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const dialogRef = useRef<HTMLElement | null>(null);
  const activeSection = sections.find((section) => section.lookupType === activeType) ?? null;

  useBodyScrollLock(Boolean(activeType));
  useDialogFocusLifecycle(Boolean(activeType), dialogRef);

  const loadRows = useCallback(async () => {
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/lookup-values`, { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load offer names.");
    const data = (await response.json()) as LookupValueRecord[];
    setRows(data);
    setStatusMessage("Offer names are ready.");
  }, [profileId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadRows().catch((error: Error) => {
      setErrorMessage(error.message);
      setStatusMessage("Offer names could not be loaded.");
    }), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadRows]);

  const valuesByType = useMemo(() => Object.fromEntries(sections.map(({ lookupType }) => [
    lookupType,
    dedupeOptions(getLookupValuesByType(rows, lookupType)).map((value) => rows.find((row) => row.lookup_type === lookupType && row.option_value === value)).filter((row): row is LookupValueRecord => Boolean(row)),
  ])) as Partial<Record<LookupValueType, LookupValueRecord[]>>, [rows]);

  function closeDialog() {
    setActiveType(null);
    setDraft("");
    setEditingId(null);
    setEditingValue("");
    setErrorMessage("");
  }

  async function createValue() {
    if (!activeType || !draft.trim()) return;
    setPendingAction("create");
    setErrorMessage("");
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/lookup-values`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lookup_type: activeType, option_value: draft.trim() }),
    });
    if (!response.ok) setErrorMessage(await response.text());
    else {
      setDraft("");
      await loadRows();
      setStatusMessage("Offer name added.");
    }
    setPendingAction("");
  }

  async function saveValue(row: LookupValueRecord) {
    if (!editingValue.trim()) return;
    setPendingAction(`save:${row.lookup_value_id}`);
    setErrorMessage("");
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/lookup-values/${row.lookup_value_id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lookup_type: row.lookup_type, option_value: editingValue.trim() }),
    });
    if (!response.ok) setErrorMessage(await response.text());
    else {
      setEditingId(null);
      setEditingValue("");
      await loadRows();
      setStatusMessage("Offer name updated.");
    }
    setPendingAction("");
  }

  async function deleteValue(row: LookupValueRecord) {
    setPendingAction(`delete:${row.lookup_value_id}`);
    setErrorMessage("");
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/lookup-values/${row.lookup_value_id}`, { method: "DELETE" });
    if (!response.ok) setErrorMessage(await response.text());
    else {
      if (editingId === row.lookup_value_id) {
        setEditingId(null);
        setEditingValue("");
      }
      await loadRows();
      setStatusMessage("Offer name removed.");
    }
    setPendingAction("");
  }

  return (
    <section aria-label="Offer name settings" className="stack" data-pd-id="profile-settings.offer-names">
      <div className="table-status" aria-live="polite">{statusMessage}</div>
      {errorMessage && !activeType ? <p className="error-text" role="alert">{errorMessage}</p> : null}
      <div className="settings-card-grid">
        {sections.map((section) => (
          <article className="content-subpanel stack settings-action-card" key={section.lookupType}>
            <div><span className="eyebrow">Profile List</span><h2>{section.title}</h2><p className="field-hint">{valuesByType[section.lookupType]?.length ?? 0} values</p></div>
            <button className="button-link settings-card-action" data-pd-id={`profile-settings.offer-names.${section.lookupType}.manage`} onClick={() => setActiveType(section.lookupType)} type="button">Manage</button>
          </article>
        ))}
      </div>
      {activeSection ? (
        <div className="modal-backdrop modal-backdrop-elevated">
          <section aria-label={`Manage ${activeSection.title}`} aria-modal="true" className="modal-panel workflow-editor-modal fund-manager-settings-modal lookup-values-modal" data-pd-id={`profile-settings.offer-names.${activeSection.lookupType}.dialog`} ref={dialogRef} role="dialog" tabIndex={-1}>
            <header className="workflow-editor-modal-header">
              <div><span className="eyebrow">Profile Settings</span><h2>{activeSection.title}</h2></div>
              <button aria-label={`Close ${activeSection.title}`} className="modal-close-button" onClick={closeDialog} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button>
            </header>
            <div className="workflow-editor-modal-body stack dialog-table-modal-body">
              {errorMessage ? <p className="error-text" role="alert">{errorMessage}</p> : null}
              <div className="table-toolbar dialog-table-toolbar">
                <label className="field-control"><span>Add {activeSection.singularLabel}</span><input data-initial-focus onChange={(event) => setDraft(event.target.value)} placeholder={`Enter ${activeSection.singularLabel}`} value={draft} /></label>
                <button className="button-link icon-text-action" disabled={!draft.trim() || Boolean(pendingAction)} onClick={() => void createValue()} type="button"><span aria-hidden="true" className="material-symbols-outlined">add</span><span>{pendingAction === "create" ? "Adding" : "Add Value"}</span></button>
              </div>
              <div className="dialog-table-viewport" data-pd-id="profile-settings.offer-names.table-viewport">
                <table className="data-table"><thead><tr><th>Offer Name</th><th>Updated</th><th>Actions</th></tr></thead><tbody>
                  {(valuesByType[activeSection.lookupType] ?? []).map((row) => (
                    <tr key={row.lookup_value_id}>
                      <td>{editingId === row.lookup_value_id ? <input aria-label={`Edit ${row.option_value}`} onChange={(event) => setEditingValue(event.target.value)} value={editingValue} /> : row.option_value}</td>
                      <td>{new Date(row.updated_at).toLocaleDateString()}</td>
                      <td><div className="table-action-group">{editingId === row.lookup_value_id ? <><button className="icon-button" aria-label={`Save ${row.option_value}`} disabled={Boolean(pendingAction)} onClick={() => void saveValue(row)} type="button"><span aria-hidden="true" className="material-symbols-outlined">check</span></button><button className="icon-button" aria-label="Cancel edit" onClick={() => { setEditingId(null); setEditingValue(""); }} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button></> : <button aria-label={`Edit ${row.option_value}`} className="icon-button" onClick={() => { setEditingId(row.lookup_value_id); setEditingValue(row.option_value); }} type="button"><span aria-hidden="true" className="material-symbols-outlined">edit</span></button>}<button aria-label={`Delete ${row.option_value}`} className="icon-button destructive-icon-button" disabled={Boolean(pendingAction)} onClick={() => void deleteValue(row)} type="button"><span aria-hidden="true" className="material-symbols-outlined">delete</span></button></div></td>
                    </tr>
                  ))}
                </tbody></table>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
