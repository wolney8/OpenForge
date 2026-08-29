"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { AccountProviderIdentity } from "@/components/account-provider-identity";
import { FinancialValue } from "@/components/financial-value";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { LedgerPagination } from "@/components/ledger-pagination";
import { LedgerTableScroll } from "@/components/ledger-table-scroll";
import { StatusToast } from "@/components/status-toast";
import { apiBaseUrl } from "@/lib/api";
import type { MasterAccountCatalogueRecord } from "@/lib/bookmaker-catalogue";

type ReviewStatus =
  | "UNREVIEWED"
  | "REVIEWED_ACCEPTED"
  | "REVIEWED_OVERRIDDEN"
  | "DEFERRED"
  | "EXCLUDED"
  | "BLOCKED";

type ReviewDecision = {
  action: string;
  status: ReviewStatus;
  note: string;
  target_type: string;
  catalogue_id: string;
  actor: string;
  updated_at: string;
  override_fields?: Record<string, string | number | boolean | null>;
};

type ReviewItem = {
  item_id: string;
  import_id: string;
  source_fingerprint: string;
  source_sheet: string;
  source_row: number;
  source_record_id: string;
  category: string;
  issue_type: string;
  issue_types: string[];
  reason: string;
  missing_fields: string[];
  proposed_target: string;
  confidence: string;
  context: {
    date: string;
    provider: string;
    offer_type: string;
    offer_name: string;
    event: string;
    stake: string;
    odds: string;
    exchange: string;
    lay_type: string;
    lay_odds: string;
    lay_stake: string;
    pnl: string;
  };
  source_fields: Record<string, string | number | boolean | null>;
  calculation_provenance: string;
  review_status: ReviewStatus;
  decision: ReviewDecision | null;
};

type Workspace = {
  run_status?: string;
  metadata: {
    source_filename: string;
    effective_at: string;
    workbook_checksum: string;
    mapping_version: string;
    original_partial_count: number;
    provider_conflict_count: number;
    historical_ep_count: number;
    real_import_performed: false;
  };
  items: ReviewItem[];
  reconciliation: {
    original_partial_count: number;
    resolved_partial_count: number;
    remaining_partial_count: number;
    excluded_count: number;
    deferred_count: number;
    review_status_counts: Record<ReviewStatus, number>;
    valid_decision_count: number;
    stale_decision_count: number;
    pnl_impact: string;
    row_count_impact: number;
    import_ready: boolean;
    real_import_performed: false;
  };
};

type Draft = {
  action: string;
  targetType: string;
  catalogueId: string;
  note: string;
  offerName: string;
  strategy: string;
  canonicalText: string;
};

const loadouts = [
  ["all", "All exceptions"],
  ["missing_provider", "Missing Provider"],
  ["sportsbook_partial", "Sportsbook Partial"],
  ["free_bets_partial", "Free Bet Partial"],
  ["casino_partial", "Casino Partial"],
  ["historical_extra_place", "Extra Place"],
  ["advanced_lay", "Advanced Lay"],
  ["text_length", "Text Length"],
  ["missing_offer_name", "Missing Offer Name"],
  ["missing_strategy", "Missing Strategy"],
  ["override_missing_reason", "Override Missing Reason"],
  ["ready", "Ready After Review"],
  ["deferred", "Deferred"],
] as const;

const labels: Record<string, string> = {
  advanced_lay: "Advanced lay",
  text_length: "Text length",
  missing_offer_name: "Missing offer name",
  missing_strategy: "Missing strategy",
  override_missing_reason: "Override missing reason",
  missing_provider: "Missing provider",
  historical_extra_place: "Historical Extra Place",
  sportsbook_partial: "Sportsbook partial",
  free_bets_partial: "Free Bet partial",
  casino_partial: "Casino partial",
};

const statusLabels: Record<ReviewStatus, string> = {
  UNREVIEWED: "Unreviewed",
  REVIEWED_ACCEPTED: "Reviewed / Accepted",
  REVIEWED_OVERRIDDEN: "Reviewed / Overridden",
  DEFERRED: "Deferred",
  EXCLUDED: "Excluded",
  BLOCKED: "Blocked",
};

const safeBatchActions: Record<string, { action: string; label: string; description: string }> = {
  advanced_lay: {
    action: "historical_imported_calculation",
    label: "Keep historical calculation",
    description: "Preserve source realised P&L and do not reconstruct modern lay branches.",
  },
  missing_strategy: {
    action: "historical_imported_calculation",
    label: "Keep historical calculation",
    description: "Preserve source realised P&L without inventing a modern strategy.",
  },
  text_length: {
    action: "preserve_and_shorten",
    label: "Preserve and shorten text",
    description: "Retain full source text in audit data and use a canonical shortened field.",
  },
  missing_offer_name: {
    action: "historical_casino_label",
    label: "Use historical label",
    description: "Use Historical Casino Offer and record that the label was migration-generated.",
  },
};

function optionsFor(item: ReviewItem) {
  if (item.category === "missing_provider") return [
    ["map_existing_provider", "Map to existing provider"],
    ["create_provider_candidate", "Create catalogue candidate"],
    ["mark_historical_provider", "Mark historical / archived"],
    ["defer", "Defer"],
  ];
  if (item.category === "historical_extra_place") return [
    ["historical_extra_place", "Historical Extra Place"],
    ["keep_sportsbook_historical", "Keep as Sportsbook historical EP"],
    ["reclassify", "Reclassify with reason"],
    ["defer", "Defer"],
    ["exclude", "Exclude"],
  ];
  if (item.issue_types.includes("override_missing_reason")) return [
    ["provide_override_reason", "Provide override reason"],
    ["remove_override", "Remove override"],
    ["historical_imported_behavior", "Retain historical behaviour"],
    ["defer", "Defer"],
    ["exclude", "Exclude"],
  ];
  const safe = item.issue_types.map((issue) => safeBatchActions[issue]).find(Boolean);
  return [
    ...(safe ? [[safe.action, safe.label]] : [["accept_proposed", "Accept proposed mapping"]]),
    ["edit_mapping", "Edit mapping"],
    ["reclassify", "Map to different target"],
    ["defer", "Defer"],
    ["exclude", "Exclude"],
  ];
}

function statusClass(status: ReviewStatus) {
  if (status === "REVIEWED_ACCEPTED") return "table-chip-success";
  if (status === "REVIEWED_OVERRIDDEN") return "table-chip-info";
  if (status === "DEFERRED") return "table-chip-warning";
  if (status === "EXCLUDED" || status === "BLOCKED") return "table-chip-danger";
  return "table-chip-neutral";
}

function initialDraft(item: ReviewItem): Draft {
  return {
    action: item.decision?.action ?? optionsFor(item)[0][0],
    targetType: item.decision?.target_type ?? item.proposed_target,
    catalogueId: item.decision?.catalogue_id ?? "",
    note: item.decision?.note ?? "",
    offerName: String(item.decision?.override_fields?.offer_name ?? ""),
    strategy: String(item.decision?.override_fields?.strategy ?? ""),
    canonicalText: String(item.decision?.override_fields?.canonical_text ?? ""),
  };
}

async function responseMessage(response: Response) {
  const body = await response.json().catch(() => null) as { detail?: string | { msg?: string }[] } | null;
  if (typeof body?.detail === "string") return body.detail;
  if (Array.isArray(body?.detail)) return body.detail.map((item) => item.msg ?? "Invalid value").join(". ");
  return "Unable to update the import review.";
}

async function fetchWorkspaceData(profileId: string, importRunId: string) {
  const [reviewResponse, catalogueResponse] = await Promise.all([
    fetch(`${apiBaseUrl}/profiles/${profileId}/workbook-imports/${importRunId}`, {
      credentials: "include",
      cache: "no-store",
    }),
    fetch(`${apiBaseUrl}/account-catalogue/source`, {
      credentials: "include",
      cache: "no-store",
    }),
  ]);
  if (!reviewResponse.ok) throw new Error(await responseMessage(reviewResponse));
  const review = await reviewResponse.json() as Workspace;
  const document = catalogueResponse.ok
    ? await catalogueResponse.json() as { records?: MasterAccountCatalogueRecord[] }
    : null;
  return {
    review,
    catalogue: (document?.records ?? []).filter((record) => record.status !== "Archived"),
  };
}

export function FounderImportReviewWorkspace({
  profileId,
  importRunId,
}: {
  profileId: string;
  importRunId: string;
}) {
  const reviewApi = `${apiBaseUrl}/profiles/${profileId}/workbook-imports/${importRunId}`;
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [catalogue, setCatalogue] = useState<MasterAccountCatalogueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [loadout, setLoadout] = useState("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [sheetFilter, setSheetFilter] = useState("");
  const [issueFilter, setIssueFilter] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<ReviewItem | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [batchPreview, setBatchPreview] = useState<{
    items: ReviewItem[];
    issue: string;
    action: string;
    description: string;
  } | null>(null);
  const [approvalAcknowledged, setApprovalAcknowledged] = useState(false);
  const editorRef = useRef<HTMLElement | null>(null);
  const filterRef = useRef<HTMLElement | null>(null);

  async function loadWorkspace() {
    setLoading(true);
    setError("");
    try {
      const result = await fetchWorkspaceData(profileId, importRunId);
      setWorkspace(result.review);
      setCatalogue(result.catalogue);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load the import review.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void fetchWorkspaceData(profileId, importRunId)
      .then((result) => {
        if (!active) return;
        setWorkspace(result.review);
        setCatalogue(result.catalogue);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Unable to load the import review.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [importRunId, profileId]);

  useEffect(() => {
    const dialog = editing ? editorRef.current : filterOpen ? filterRef.current : null;
    if (!dialog) return;
    dialog.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || saving) return;
      setEditing(null);
      setDraft(null);
      setFilterOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editing, filterOpen, saving]);

  const filtered = useMemo(() => (workspace?.items ?? []).filter((item) => {
    const query = search.trim().toLocaleLowerCase();
    const searchable = [
      item.source_sheet, item.source_row, item.import_id, item.context.provider,
      item.context.offer_type, item.context.offer_name, item.context.event, item.reason,
      item.proposed_target, ...item.issue_types,
    ].join(" ").toLocaleLowerCase();
    if (query && !searchable.includes(query)) return false;
    if (statusFilter && item.review_status !== statusFilter) return false;
    if (sheetFilter && item.source_sheet !== sheetFilter) return false;
    if (issueFilter && !item.issue_types.includes(issueFilter)) return false;
    if (loadout === "ready") return item.review_status.startsWith("REVIEWED_");
    if (loadout === "deferred") return item.review_status === "DEFERRED";
    if (loadout !== "all" && item.category !== loadout && !item.issue_types.includes(loadout)) return false;
    return true;
  }), [issueFilter, loadout, search, sheetFilter, statusFilter, workspace]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const effectivePage = Math.min(page, pageCount);
  const rows = filtered.slice((effectivePage - 1) * pageSize, effectivePage * pageSize);
  const activeFilterCount = Number(Boolean(statusFilter)) + Number(Boolean(sheetFilter)) + Number(Boolean(issueFilter));
  const selectedItems = (workspace?.items ?? []).filter((item) => selected.has(item.item_id));
  const commonBatchIssue = selectedItems.length
    ? selectedItems[0].issue_types.find((issue) => selectedItems.every((item) => item.issue_types.includes(issue)) && safeBatchActions[issue])
    : undefined;

  function chooseLoadout(value: string) {
    setLoadout(value);
    setPage(1);
    setSelected(new Set());
  }

  function openEditor(item: ReviewItem) {
    setEditing(item);
    setDraft(initialDraft(item));
  }

  async function saveDecision() {
    if (!editing || !draft) return;
    setSaving(true);
    try {
      const response = await fetch(`${reviewApi}/decisions/${editing.item_id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: editing.item_id,
          source_fingerprint: editing.source_fingerprint,
          action: draft.action,
          target_type: draft.targetType,
          catalogue_id: draft.catalogueId,
          note: draft.note,
          override_fields: Object.fromEntries([
            ["offer_name", draft.offerName.trim()],
            ["strategy", draft.strategy.trim()],
            ["canonical_text", draft.canonicalText.trim()],
          ].filter(([, value]) => value)),
        }),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      setWorkspace(await response.json() as Workspace);
      setEditing(null);
      setDraft(null);
      setMessage("Import review decision saved.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to save the review decision.");
    } finally {
      setSaving(false);
    }
  }

  function previewBatch() {
    if (!commonBatchIssue) return;
    const rule = safeBatchActions[commonBatchIssue];
    setBatchPreview({
      items: selectedItems,
      issue: commonBatchIssue,
      action: rule.action,
      description: rule.description,
    });
  }

  async function applyBatch() {
    if (!batchPreview) return;
    setSaving(true);
    try {
      const response = await fetch(`${reviewApi}/decisions/batch`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_ids: batchPreview.items.map((item) => item.item_id),
          source_fingerprints: Object.fromEntries(batchPreview.items.map((item) => [item.item_id, item.source_fingerprint])),
          issue_type: batchPreview.issue,
          action: batchPreview.action,
          note: `Approved batch rule: ${batchPreview.description}`,
        }),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      setWorkspace(await response.json() as Workspace);
      setSelected(new Set());
      setBatchPreview(null);
      setMessage("Batch review decisions saved.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to apply the batch review.");
    } finally {
      setSaving(false);
    }
  }

  async function rerun() {
    setSaving(true);
    try {
      const response = await fetch(`${reviewApi}/rerun`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      const result = await response.json() as { reconciliation: Workspace["reconciliation"] };
      setWorkspace((current) => current ? { ...current, reconciliation: result.reconciliation } : current);
      setMessage("Dry run rerun completed without importing data.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to rerun the dry run.");
    } finally {
      setSaving(false);
    }
  }

  async function approveReview() {
    if (!workspace?.reconciliation.import_ready || !approvalAcknowledged) return;
    setSaving(true);
    try {
      const response = await fetch(`${reviewApi}/approve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workbook_checksum: workspace.metadata.workbook_checksum,
          acknowledged: true,
        }),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      setWorkspace((current) => current ? { ...current, run_status: "READY_APPROVED" } : current);
      setApprovalAcknowledged(false);
      setMessage("Workbook dry run approved. No Profile data was imported.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to approve the workbook review.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <section className="content-panel stack"><LedgerLoadingIndicator label="Loading Profile import review" /></section>;
  if (error || !workspace) return <section className="content-panel stack"><span className="eyebrow">Import review</span><h1>Unable to load review</h1><p className="error-text" role="alert">{error}</p><button className="button-link" onClick={() => void loadWorkspace()} type="button">Try again</button></section>;

  return <>
    <StatusToast message={message} onDismiss={() => setMessage("")} />
    <section className="content-panel stack founder-import-review" data-pd-id="founder-import-review.workspace">
      <header className="sportsbook-page-header">
        <div><span className="eyebrow">Founder workbook</span><h1 className="sportsbook-page-title">Import Review</h1></div>
        <button className="button-link icon-text-action" disabled={saving} onClick={() => void rerun()} type="button">
          {saving ? <span aria-hidden="true" className="button-spinner" /> : <span aria-hidden="true" className="material-symbols-outlined">refresh</span>}
          <span>Rerun dry run</span>
        </button>
      </header>
      <section className="stat-card-grid import-review-stat-grid" aria-label="Import review status">
        <article className="stat-card"><span className="eyebrow">Partial rows</span><strong>{workspace.metadata.original_partial_count}</strong><span>{workspace.reconciliation.resolved_partial_count} resolved</span></article>
        <article className="stat-card"><span className="eyebrow">Remaining</span><strong>{workspace.reconciliation.remaining_partial_count}</strong><span>Require review decisions</span></article>
        <article className="stat-card"><span className="eyebrow">Provider conflicts</span><strong>{workspace.metadata.provider_conflict_count}</strong><span>Global catalogue resolution</span></article>
        <article className="stat-card"><span className="eyebrow">Historical EP</span><strong>{workspace.metadata.historical_ep_count}</strong><span>Explicit destination required</span></article>
        <article className="stat-card"><span className="eyebrow">P&amp;L impact</span><strong><FinancialValue animate={false} value={workspace.reconciliation.pnl_impact} /></strong><span>Excluded or deferred source value</span></article>
      </section>
      <div aria-label="Import review controls" className="sportsbook-review-bar" role="toolbar">
        <label className="field-control table-search-field"><span className="visually-hidden">Search import exceptions</span><input aria-label="Search import exceptions" onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search import exceptions" type="search" value={search} /></label>
        <div className="extra-place-toolbar-actions">
          <button className="button-link icon-text-action" disabled={!commonBatchIssue} onClick={previewBatch} title={commonBatchIssue ? "Review selected matching rows" : "Select rows sharing a safe batch rule"} type="button"><span aria-hidden="true" className="material-symbols-outlined">library_add_check</span><span>Review selected</span></button>
          <div className="table-filter-button-wrap">
            <button aria-haspopup="dialog" aria-label="Filter import review" className={`icon-button table-filter-button${activeFilterCount ? " has-active-table-controls" : ""}`} onClick={() => setFilterOpen(true)} title="Filter import review" type="button"><span aria-hidden="true" className="material-symbols-outlined">filter_alt</span>{activeFilterCount ? <span className="table-filter-badge">{activeFilterCount}</span> : null}</button>
            {activeFilterCount ? <button aria-label="Clear import review filters" className="table-filter-clear" onClick={() => { setStatusFilter(""); setSheetFilter(""); setIssueFilter(""); setPage(1); }} type="button">×</button> : null}
          </div>
        </div>
      </div>
      <div className="extra-place-table-heading-controls"><div className="tracker-nav extra-place-loadouts import-review-loadouts" role="group" aria-label="Import review loadouts">{loadouts.map(([value, label]) => <button aria-pressed={loadout === value} className={`review-chip${loadout === value ? " is-active" : ""}`} key={value} onClick={() => chooseLoadout(value)} type="button">{label}</button>)}</div></div>
      <LedgerPagination ariaLabel="Import review" currentPage={effectivePage} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} pageCount={pageCount} pageSize={pageSize} position="top" totalRows={filtered.length} />
      <LedgerTableScroll dataPdId="founder-import-review.table-scroll">
        <table className="data-table import-review-table">
          <thead><tr><th scope="col">Select</th><th scope="col">Source</th><th scope="col">Provider / Event</th><th scope="col">Bet context</th><th scope="col">P&amp;L</th><th scope="col">Proposed target</th><th scope="col">Issue</th><th scope="col">Review state</th><th scope="col">Actions</th></tr></thead>
          <tbody>{rows.length ? rows.map((item) => {
            const provider = catalogue.find((record) =>
              [record.brand_name, record.short_display_name].some(
                (name) => name.toLocaleLowerCase() === item.context.provider.toLocaleLowerCase()
              )
            ) ?? null;
            const batchEligible = item.issue_types.some((issue) => safeBatchActions[issue]);
            return <tr key={item.item_id}>
              <td><input aria-label={`Select ${item.source_sheet} row ${item.source_row} for batch review`} checked={selected.has(item.item_id)} disabled={!batchEligible} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(item.item_id)) next.delete(item.item_id); else next.add(item.item_id); return next; })} type="checkbox" /></td>
              <td><strong>{item.source_sheet} · {item.source_row}</strong><span className="table-status">{item.source_record_id || "No source ID"}</span><span className="spreadsheet-row-id" title={item.import_id}>{item.import_id.slice(0, 18)}…</span></td>
              <td>{item.context.provider ? <AccountProviderIdentity fallbackName={item.context.provider} provider={provider} /> : "—"}<span className="table-status">{item.context.event || item.context.offer_name || "No event label"}</span></td>
              <td><strong>{item.context.offer_type || "—"}</strong><span className="table-status">{[item.context.stake && `Stake ${item.context.stake}`, item.context.odds && `Odds ${item.context.odds}`, item.context.exchange].filter(Boolean).join(" · ") || "No modern bet inputs"}</span></td>
              <td>{item.context.pnl ? <FinancialValue animate={false} value={item.context.pnl} /> : "—"}<span className="table-status">{item.calculation_provenance.replaceAll("_", " ")}</span></td>
              <td>{item.proposed_target}</td>
              <td><span className="table-chip table-chip-warning">{labels[item.issue_type] ?? item.issue_type.replaceAll("_", " ")}</span><details><summary>Details</summary><p>{item.reason}</p>{item.missing_fields.length ? <p>Missing: {item.missing_fields.join(", ")}</p> : null}</details></td>
              <td><span className={`table-chip ${statusClass(item.review_status)}`}>{statusLabels[item.review_status]}</span>{item.decision?.note ? <span className="table-status">{item.decision.note}</span> : null}</td>
              <td><button aria-label={`Review ${item.source_sheet} row ${item.source_row}`} className="icon-button" onClick={() => openEditor(item)} title="Review mapping" type="button"><span aria-hidden="true" className="material-symbols-outlined">edit_note</span></button></td>
            </tr>;
          }) : <tr><td className="empty-cell" colSpan={9}>No import exceptions match the current view.</td></tr>}</tbody>
        </table>
      </LedgerTableScroll>
      <LedgerPagination ariaLabel="Import review" currentPage={effectivePage} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} pageCount={pageCount} pageSize={pageSize} position="bottom" totalRows={filtered.length} />
      <section className="content-subpanel stack-tight" aria-label="Import readiness approval">
        <strong>{workspace.run_status === "READY_APPROVED" ? "Dry run approved" : workspace.reconciliation.import_ready ? "Ready for approval" : "Review required"}</strong>
        <span>{workspace.reconciliation.import_ready ? "Approval records readiness only. It does not import Accounts or ledger rows." : `${workspace.reconciliation.remaining_partial_count} partial rows still require an accepted review decision.`}</span>
        {workspace.reconciliation.import_ready && workspace.run_status !== "READY_APPROVED" ? <div className="tracker-nav">
          <label className="spreadsheet-confirmation-control"><input checked={approvalAcknowledged} onChange={(event) => setApprovalAcknowledged(event.target.checked)} type="checkbox" /><span>I confirm this checksum and reconciliation are ready for the later import gate.</span></label>
          <button className="modal-primary-button icon-text-action" disabled={!approvalAcknowledged || saving} onClick={() => void approveReview()} type="button"><span aria-hidden="true" className="material-symbols-outlined">verified</span><span>Approve dry run</span></button>
        </div> : null}
      </section>
      <p className="field-support-text">{workspace.metadata.source_filename} · {workspace.metadata.mapping_version} · checksum {workspace.metadata.workbook_checksum.slice(0, 12)}… · no production import performed</p>
    </section>

    {filterOpen && typeof document !== "undefined" ? createPortal(<div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setFilterOpen(false); }}><section aria-labelledby="import-review-filter-title" aria-modal="true" className="modal-panel accounts-filter-modal" ref={filterRef} role="dialog" tabIndex={-1}><header className="modal-sticky-header sportsbook-page-header"><div><span className="eyebrow">Table controls</span><h2 id="import-review-filter-title">Filter import review</h2></div><button aria-label="Close import review filters" className="modal-close-button" onClick={() => setFilterOpen(false)} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button></header><div className="form-grid accounts-filter-form-grid"><label className="field-control"><span>Source sheet</span><select onChange={(event) => { setSheetFilter(event.target.value); setPage(1); }} value={sheetFilter}><option value="">All</option>{[...new Set(workspace.items.map((item) => item.source_sheet))].map((sheet) => <option key={sheet}>{sheet}</option>)}</select></label><label className="field-control"><span>Review state</span><select onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} value={statusFilter}><option value="">All</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field-control"><span>Issue type</span><select onChange={(event) => { setIssueFilter(event.target.value); setPage(1); }} value={issueFilter}><option value="">All</option>{[...new Set(workspace.items.flatMap((item) => item.issue_types))].sort().map((issue) => <option key={issue} value={issue}>{labels[issue] ?? issue.replaceAll("_", " ")}</option>)}</select></label></div><div className="tracker-nav"><button className="review-chip" onClick={() => { setStatusFilter(""); setSheetFilter(""); setIssueFilter(""); setPage(1); }} type="button">Clear filters</button><button className="review-chip review-chip-copy" onClick={() => setFilterOpen(false)} type="button">Done</button></div></section></div>, document.body) : null}

    {editing && draft && typeof document !== "undefined" ? createPortal(<div className="modal-backdrop modal-backdrop-elevated" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) { setEditing(null); setDraft(null); } }}><section aria-labelledby="import-review-editor-title" aria-modal="true" className="modal-panel workflow-editor-modal import-review-editor-modal" ref={editorRef} role="dialog" tabIndex={-1}><header className="workflow-panel-header workflow-editor-header"><div><span className="eyebrow">{editing.source_sheet} · row {editing.source_row}</span><h2 id="import-review-editor-title">Review import mapping</h2></div><button aria-label="Close import mapping review" className="modal-close-button" disabled={saving} onClick={() => { setEditing(null); setDraft(null); }} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button></header><div className="workflow-editor-body"><section className="stat-card-grid import-review-dialog-stats"><article className="stat-card"><span className="eyebrow">Issue</span><strong>{labels[editing.issue_type] ?? editing.issue_type.replaceAll("_", " ")}</strong></article><article className="stat-card"><span className="eyebrow">Source realised P&amp;L</span><strong>{editing.context.pnl ? <FinancialValue animate={false} value={editing.context.pnl} /> : "Unavailable"}</strong></article><article className="stat-card"><span className="eyebrow">Confidence</span><strong>{editing.confidence.replaceAll("_", " ")}</strong></article></section><p>{editing.reason}</p>{editing.missing_fields.length ? <p className="warning-text">Unsupported fields remain null: {editing.missing_fields.join(", ")}.</p> : null}<div className="form-grid"><label className="field-control"><span>Decision</span><select onChange={(event) => setDraft((current) => current ? { ...current, action: event.target.value, targetType: event.target.value === "reclassify" ? "Sportsbook Bet" : current.targetType } : current)} value={draft.action}>{optionsFor(editing).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{draft.action === "map_existing_provider" ? <label className="field-control"><span>Catalogue provider</span><select onChange={(event) => setDraft((current) => current ? { ...current, catalogueId: event.target.value } : current)} value={draft.catalogueId}><option value="">Select provider</option>{catalogue.map((provider) => <option key={provider.catalogue_id} value={provider.catalogue_id}>{provider.brand_name} · {provider.account_type}</option>)}</select></label> : null}{draft.action === "reclassify" ? <label className="field-control"><span>Target ledger</span><select onChange={(event) => setDraft((current) => current ? { ...current, targetType: event.target.value } : current)} value={draft.targetType}><option>Sportsbook Bet</option><option>Free Bet</option><option>Casino Offer</option><option>Extra Place</option><option>Mug Bet</option></select></label> : null}{draft.action === "edit_mapping" && editing.issue_types.includes("missing_offer_name") ? <label className="field-control"><span>Offer name</span><input onChange={(event) => setDraft((current) => current ? { ...current, offerName: event.target.value } : current)} value={draft.offerName} /></label> : null}{draft.action === "edit_mapping" && (editing.issue_types.includes("missing_strategy") || editing.issue_types.includes("advanced_lay")) ? <label className="field-control"><span>Strategy</span><input onChange={(event) => setDraft((current) => current ? { ...current, strategy: event.target.value } : current)} value={draft.strategy} /></label> : null}{draft.action === "edit_mapping" && editing.issue_types.includes("text_length") ? <label className="field-control field-span-2"><span>Canonical shortened text</span><textarea maxLength={200} onChange={(event) => setDraft((current) => current ? { ...current, canonicalText: event.target.value } : current)} rows={3} value={draft.canonicalText} /></label> : null}<label className="field-control field-span-2"><span>Review note / reason</span><textarea onChange={(event) => setDraft((current) => current ? { ...current, note: event.target.value } : current)} rows={4} value={draft.note} /></label></div>{draft.action === "create_provider_candidate" ? <p className="warning-text">This records a blocked candidate decision only. Complete normal catalogue validation before resolving it. <Link href="/settings#catalogue">Open Account Catalogue</Link>.</p> : null}<details><summary>Source fields retained for audit</summary><dl className="spreadsheet-row-details">{Object.entries(editing.source_fields).filter(([, value]) => value !== "" && value !== null).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{String(value)}</dd></div>)}</dl></details></div><footer className="workflow-editor-footer tracker-nav"><button className="button-link" disabled={saving} onClick={() => { setEditing(null); setDraft(null); }} type="button">Cancel</button><button className="modal-primary-button icon-text-action" disabled={saving} onClick={() => void saveDecision()} type="button">{saving ? <span aria-hidden="true" className="button-spinner" /> : <span aria-hidden="true" className="material-symbols-outlined">save</span>}<span>{saving ? "Saving" : "Save decision"}</span></button></footer></section></div>, document.body) : null}

    {batchPreview && typeof document !== "undefined" ? createPortal(<div className="modal-backdrop modal-backdrop-elevated"><section aria-labelledby="import-review-batch-title" aria-modal="true" className="modal-panel import-review-batch-modal stack" role="alertdialog"><header className="workflow-panel-header"><div><span className="eyebrow">Batch review</span><h2 id="import-review-batch-title">Confirm {batchPreview.items.length} decisions</h2></div><button aria-label="Close batch review" className="modal-close-button" disabled={saving} onClick={() => setBatchPreview(null)} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button></header><p><strong>{labels[batchPreview.issue] ?? batchPreview.issue.replaceAll("_", " ")}</strong></p><p>{batchPreview.description}</p><section className="content-subpanel stack-tight"><strong>Representative examples</strong>{batchPreview.items.slice(0, 3).map((item) => <span key={item.item_id}>{item.source_sheet} row {item.source_row} · {item.context.provider || item.context.event || item.source_record_id}</span>)}</section><p className="warning-text">This records auditable review decisions only. It does not import or alter workbook rows.</p><div className="tracker-nav"><button className="button-link" disabled={saving} onClick={() => setBatchPreview(null)} type="button">Cancel</button><button className="modal-primary-button icon-text-action" disabled={saving} onClick={() => void applyBatch()} type="button">{saving ? <span aria-hidden="true" className="button-spinner" /> : <span aria-hidden="true" className="material-symbols-outlined">library_add_check</span>}<span>{saving ? "Applying" : "Apply batch rule"}</span></button></div></section></div>, document.body) : null}
  </>;
}
