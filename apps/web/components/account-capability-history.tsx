"use client";

import { useRef, useState } from "react";
import { apiBaseUrl } from "@/lib/api";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";

type Entry = {
  observation_id: string; revision: number; capability: string; scope_kind: "general" | "offer";
  scope_ref: string; entry_kind: string; state: string; interpretation: string; confidence: string;
  evidence_type: string; evidence_note: string; source_ref: string; observed_at: string | null;
  observed_precision: string; effective_from: string | null; effective_precision: string;
  correction_of: string | null; correction_reason: string;
  actor: string; recorded_at: string;
};
type Summary = {
  revision: number; capabilities: { key: string; capability: string; scope_kind: string;
    scope_ref: string; state: string; interpretation: string; confidence: string;
    conflicting: boolean; supporting_ids: string[] }[];
  last_reviewed_at: string | null; last_verified_at: string | null;
  next_review_on: string | null; review_due: boolean; review_status: string;
};
type History = { entries: Entry[]; account_audit: { audit_id: string; action: string; changed_at: string }[]; summary: Summary };
type Draft = {
  capability: string; scope_kind: "general" | "offer"; scope_ref: string;
  entry_kind: "observation" | "review_no_change" | "review_no_test" | "correction" | "retraction";
  state: string; interpretation: "confirmed" | "suspected" | "conflicting" | "unknown";
  confidence: "verified" | "likely" | "unverified" | "stale";
  evidence_type: string; evidence_note: string; source_ref: string;
  observed_precision: "exact" | "day" | "approximate" | "unknown"; observed_at: string;
  effective_precision: "exact" | "day" | "approximate" | "unknown"; effective_from: string;
  next_review_action: "keep" | "set" | "clear"; next_review_on: string;
  correction_of: string; correction_reason: string;
};
const emptyDraft = (): Draft => ({
  capability: "GeneralSportsbookPromotions", scope_kind: "general", scope_ref: "",
  entry_kind: "observation", state: "Unknown", interpretation: "unknown",
  confidence: "unverified", evidence_type: "ManualReview", evidence_note: "", source_ref: "",
  observed_precision: "unknown", observed_at: "", next_review_action: "keep", next_review_on: "",
  effective_precision: "unknown", effective_from: "",
  correction_of: "", correction_reason: "",
});
const capabilities = ["LoginAccess", "DepositAccess", "WithdrawalAccess", "StandardSportsbookBetting", "ArbitrageBetting", "PriceBoosts", "ProfitBoosts", "GeneralSportsbookPromotions", "ReloadOffers", "ExtraPlaces", "CasinoOffers", "FreeSpins"];
const states = ["Unknown", "Working", "WorkingWithLimits", "HeavilyRestricted", "Unavailable", "Rejected", "Blocked", "NotChecked"];
function safeSourceLink(value: string): string | null {
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:" ? url.href : null; }
  catch { return null; }
}

export function AccountCapabilityHistory({ accountId, profileId }: { accountId: string; profileId: string }) {
  const [history, setHistory] = useState<History | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  const attemptedFingerprint = useRef("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const url = `${apiBaseUrl}/profiles/${profileId}/accounts/${accountId}/capability-history`;

  async function load(force = false) {
    if (loading || (history && !force)) return;
    setLoading(true);
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 503 ? "Capability history is not activated for this database." : "Account capability history could not be loaded.");
      setHistory(await response.json() as History);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Account capability history could not be loaded.");
    } finally { setLoading(false); }
  }

  async function save() {
    if (saving || !history) return;
    const form = document.getElementById("account-capability-form");
    const invalid = form?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input:invalid, select:invalid, textarea:invalid");
    if (invalid) { invalid.reportValidity(); invalid.focus(); return; }
    if (draft.scope_kind === "offer" && !draft.scope_ref.trim()) { setError("Enter the specific offer reference."); return; }
    if (draft.correction_of && !draft.correction_reason.trim()) { setError("Explain why this entry is corrected or retracted."); return; }
    const fingerprint = JSON.stringify(draft);
    const nextOperationId = attemptedFingerprint.current && attemptedFingerprint.current !== fingerprint ? crypto.randomUUID() : operationId;
    if (nextOperationId !== operationId) setOperationId(nextOperationId);
    attemptedFingerprint.current = fingerprint;
    setSaving(true); setError(""); setMessage("");
    try {
      const payload = {
        ...draft,
        operation_id: nextOperationId,
        expected_revision: history.summary.revision,
        scope_ref: draft.scope_kind === "offer" ? draft.scope_ref.trim() : "",
        observed_at: draft.observed_precision === "unknown" ? null : draft.observed_precision === "exact" ? new Date(draft.observed_at).toISOString() : draft.observed_at,
        effective_from: draft.effective_precision === "unknown" ? null : draft.effective_precision === "exact" ? new Date(draft.effective_from).toISOString() : draft.effective_from,
        next_review_on: draft.next_review_action === "set" ? draft.next_review_on : null,
        correction_of: draft.correction_of || null,
      };
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        if (response.status === 409) await load(true);
        throw new Error(typeof detail.detail === "string" ? detail.detail : "Observation was not saved. Review your draft and retry.");
      }
      const result = await response.json() as { entry: Entry; summary: Summary };
      setHistory(current => current ? { ...current, entries: [result.entry, ...current.entries], summary: result.summary } : current);
      setDraft(emptyDraft()); setOperationId(crypto.randomUUID()); attemptedFingerprint.current = ""; setMessage("Observation saved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Observation was not saved. Keep your draft and retry.");
    } finally { setSaving(false); }
  }

  function correct(entry: Entry, kind: "correction" | "retraction") {
    setDraft({ ...emptyDraft(), capability: entry.capability, scope_kind: entry.scope_kind,
      scope_ref: entry.scope_ref, entry_kind: kind, state: entry.state,
      interpretation: entry.interpretation as Draft["interpretation"],
      confidence: entry.confidence as Draft["confidence"], evidence_type: entry.evidence_type,
      evidence_note: entry.evidence_note, source_ref: entry.source_ref,
      observed_precision: entry.observed_precision as Draft["observed_precision"],
      observed_at: entry.observed_at?.slice(0, 16) ?? "", correction_of: entry.observation_id,
      effective_precision: entry.effective_precision as Draft["effective_precision"],
      effective_from: entry.effective_from?.slice(0, 16) ?? "",
      correction_reason: "",
    });
    requestAnimationFrame(() => {
      document.getElementById("account-capability-form")?.scrollIntoView({ block: "start" });
      document.getElementById("account-capability-correction-reason")?.focus();
    });
  }

  return <details className="content-subpanel stack-tight financial-history-panel" data-pd-id="accounts.capability.history" onToggle={event => { if (event.currentTarget.open) void load(); }}>
    <summary>Capability history and review {history ? <span className="table-chip">{history.entries.length}</span> : null}</summary>
    {loading ? <LedgerLoadingIndicator label="Loading Account capability history" /> : null}
    {error ? <p className="field-validation-text" role="alert">{error} {history ? <button className="review-chip" onClick={() => void load(true)} type="button">Refresh</button> : null}</p> : null}
    {message ? <p role="status">{message}</p> : null}
    {history ? <div className="stack-tight">
      <section className="stack-tight" aria-label="Evidence summary" data-pd-id="accounts.capability.summary">
        <h3>Evidence summary</h3>
        <p className="field-hint">Account access fields remain the eligibility authority. These observations support review; they do not change access.</p>
        {history.summary.capabilities.length ? <ul className="financial-history-list">{history.summary.capabilities.map(item => <li key={item.key}><strong>{item.capability}</strong> · {item.scope_kind === "offer" ? `Offer: ${item.scope_ref}` : "General access"} · {item.state} · {item.confidence}{item.conflicting ? " · Conflicting evidence" : ""}<small> Supporting records: {item.supporting_ids.join(", ")}</small></li>)}</ul> : <p className="compact-empty-state">No capability evidence recorded. Current Account access fields are not backfilled into history.</p>}
        <p>Last reviewed: {history.summary.last_reviewed_at || "Not recorded"} · Last verified: {history.summary.last_verified_at || "Not recorded"}</p>
        <p>Next manual review: {history.summary.next_review_on || "Not set"} · {history.summary.review_status}</p>
        <button className="review-chip" onClick={() => document.getElementById("account-access-title")?.scrollIntoView({ block: "start" })} type="button">Review Account access fields</button>
      </section>
      <div className="stack-tight" data-pd-id="accounts.capability.form" id="account-capability-form" onKeyDown={event => { if (event.key === "Enter" && event.target instanceof HTMLInputElement) { event.preventDefault(); void save(); } }}>
        <h3>{draft.entry_kind === "correction" ? "Correct observation" : draft.entry_kind === "retraction" ? "Retract observation" : "Record capability review"}</h3>
        <div className="form-grid">
          <label className="field-control"><span>Capability</span><select value={draft.capability} onChange={event => setDraft(d => ({ ...d, capability: event.target.value }))}>{capabilities.map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="field-control"><span>Scope</span><select value={draft.scope_kind} onChange={event => setDraft(d => ({ ...d, scope_kind: event.target.value as Draft["scope_kind"], scope_ref: "" }))}><option value="general">General access</option><option value="offer">Specific offer</option></select></label>
          {draft.scope_kind === "offer" ? <label className="field-control"><span>Offer reference</span><input required maxLength={160} value={draft.scope_ref} onChange={event => setDraft(d => ({ ...d, scope_ref: event.target.value }))} /></label> : null}
          <label className="field-control"><span>Review outcome</span><select value={draft.entry_kind} onChange={event => setDraft(d => ({ ...d, entry_kind: event.target.value as Draft["entry_kind"], correction_of: event.target.value === "correction" || event.target.value === "retraction" ? d.correction_of : "", correction_reason: event.target.value === "correction" || event.target.value === "retraction" ? d.correction_reason : "" }))}><option value="observation">Observation</option><option value="review_no_change">No change</option><option value="review_no_test">No opportunity to test</option>{draft.correction_of ? <><option value="correction">Correction</option><option value="retraction">Retraction</option></> : null}</select></label>
          {draft.entry_kind === "observation" || draft.entry_kind === "correction" ? <><label className="field-control"><span>Observed state</span><select value={draft.state} onChange={event => setDraft(d => ({ ...d, state: event.target.value }))}>{states.map(value => <option key={value}>{value}</option>)}</select></label><label className="field-control"><span>Interpretation</span><select value={draft.interpretation} onChange={event => setDraft(d => ({ ...d, interpretation: event.target.value as Draft["interpretation"] }))}>{["unknown", "suspected", "confirmed", "conflicting"].map(value => <option key={value}>{value}</option>)}</select></label></> : null}
          <label className="field-control"><span>Confidence</span><select value={draft.confidence} onChange={event => setDraft(d => ({ ...d, confidence: event.target.value as Draft["confidence"] }))}>{["unverified", "likely", "verified", "stale"].map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="field-control"><span>Evidence type</span><input required maxLength={80} value={draft.evidence_type} onChange={event => setDraft(d => ({ ...d, evidence_type: event.target.value }))} /></label>
          <label className="field-control"><span>Observed date precision</span><select value={draft.observed_precision} onChange={event => setDraft(d => ({ ...d, observed_precision: event.target.value as Draft["observed_precision"], observed_at: "" }))}><option value="unknown">Unknown</option><option value="day">Known day</option><option value="approximate">Approximate day</option><option value="exact">Exact time</option></select></label>
          {draft.observed_precision !== "unknown" ? <label className="field-control"><span>Observed {draft.observed_precision === "exact" ? "date and time" : "date"}</span><input required type={draft.observed_precision === "exact" ? "datetime-local" : "date"} value={draft.observed_at} onChange={event => setDraft(d => ({ ...d, observed_at: event.target.value }))} /></label> : null}
          <label className="field-control"><span>Effective date precision</span><select value={draft.effective_precision} onChange={event => setDraft(d => ({ ...d, effective_precision: event.target.value as Draft["effective_precision"], effective_from: "" }))}><option value="unknown">Unknown</option><option value="day">Known day</option><option value="approximate">Approximate day</option><option value="exact">Exact time</option></select></label>
          {draft.effective_precision !== "unknown" ? <label className="field-control"><span>Effective {draft.effective_precision === "exact" ? "date and time" : "date"}</span><input required type={draft.effective_precision === "exact" ? "datetime-local" : "date"} value={draft.effective_from} onChange={event => setDraft(d => ({ ...d, effective_from: event.target.value }))} /></label> : null}
          <label className="field-control"><span>Next review</span><select value={draft.next_review_action} onChange={event => setDraft(d => ({ ...d, next_review_action: event.target.value as Draft["next_review_action"], next_review_on: "" }))}><option value="keep">Keep current date</option><option value="set">Set manual date</option><option value="clear">Clear date</option></select></label>
          {draft.next_review_action === "set" ? <label className="field-control"><span>Next review date</span><input required type="date" value={draft.next_review_on} onChange={event => setDraft(d => ({ ...d, next_review_on: event.target.value }))} /></label> : null}
          <label className="field-control field-span-2"><span>Evidence and context</span><textarea maxLength={1000} rows={3} value={draft.evidence_note} onChange={event => setDraft(d => ({ ...d, evidence_note: event.target.value }))} /></label>
          <label className="field-control"><span>Source reference</span><input maxLength={240} value={draft.source_ref} onChange={event => setDraft(d => ({ ...d, source_ref: event.target.value }))} /></label>
          {draft.correction_of ? <label className="field-control field-span-2"><span>Reason for {draft.entry_kind}</span><textarea id="account-capability-correction-reason" required maxLength={500} rows={2} value={draft.correction_reason} onChange={event => setDraft(d => ({ ...d, correction_reason: event.target.value }))} /></label> : null}
        </div>
        <div className="workflow-editor-footer-primary"><button className="modal-primary-button" disabled={saving} onClick={() => void save()} type="button">{saving ? <span aria-hidden="true" className="button-spinner" /> : null}Record review</button><button className="review-chip" disabled={saving} onClick={() => { setDraft(emptyDraft()); setOperationId(crypto.randomUUID()); attemptedFingerprint.current = ""; setError(""); }} type="button">Cancel draft</button></div>
      </div>
      <section className="stack-tight" aria-label="Capability and Account timeline" data-pd-id="accounts.capability.timeline"><h3>Account timeline</h3><ol className="financial-history-list">{history.entries.map(entry => <li className="financial-history-event" key={entry.observation_id}><strong>{entry.capability} · {entry.entry_kind}</strong><p>{entry.scope_kind === "offer" ? `Offer: ${entry.scope_ref}` : "General access"} · {entry.state} · {entry.interpretation} · {entry.confidence}</p><p>{entry.evidence_type}{entry.evidence_note ? ` · ${entry.evidence_note}` : ""}</p>{entry.source_ref ? <p>Source: {safeSourceLink(entry.source_ref) ? <a href={safeSourceLink(entry.source_ref)!} rel="noopener noreferrer" target="_blank">{entry.source_ref}</a> : entry.source_ref}</p> : null}{entry.correction_reason ? <p>Correction reason: {entry.correction_reason}</p> : null}<small>Observed: {entry.observed_at || "Unknown"} ({entry.observed_precision}) · Effective: {entry.effective_from || "Unknown"} ({entry.effective_precision}) · Recorded: {entry.recorded_at} · {entry.actor}{entry.correction_of ? ` · Corrects ${entry.correction_of}` : ""}</small><div className="workflow-editor-footer-primary"><button className="review-chip" onClick={() => correct(entry, "correction")} type="button">Correct this observation</button><button className="review-chip" onClick={() => correct(entry, "retraction")} type="button">Retract</button></div></li>)}{history.account_audit.map(entry => <li className="financial-history-event" key={entry.audit_id}><strong>Account · {entry.action}</strong><small>{entry.changed_at}</small></li>)}</ol></section>
    </div> : null}
  </details>;
}
