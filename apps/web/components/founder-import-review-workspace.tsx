"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { AccountProviderIdentity } from "@/components/account-provider-identity";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { FinancialValue } from "@/components/financial-value";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { LedgerPagination } from "@/components/ledger-pagination";
import { LedgerTableScroll } from "@/components/ledger-table-scroll";
import { StatusToast } from "@/components/status-toast";
import { IMPORT_EXECUTION_REFRESH_EVENT } from "@/components/import-execution-monitor";
import { apiBaseUrl } from "@/lib/api";
import { resolveImportRunPresentation } from "@/lib/import-run-presentation";
import { isPostImportIntegrityCheckPassed } from "@/lib/post-import-integrity";
import { beginShellLoading, endShellLoading } from "@/lib/shell-loading";
import type { MasterAccountCatalogueRecord } from "@/lib/bookmaker-catalogue";

type ReviewStatus =
  | "UNREVIEWED"
  | "REVIEWED_ACCEPTED"
  | "REVIEWED_OVERRIDDEN"
  | "DEFERRED"
  | "EXCLUDED"
  | "BLOCKED";

type PreflightRequestState = "IDLE" | "VALIDATING" | "PASSED" | "FAILED";

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
    status: string;
    result: string;
    bet_type: string;
    notes: string;
  };
  source_fields: Record<string, string | number | boolean | null>;
  calculation_provenance: string;
  review_status: ReviewStatus;
  decision: ReviewDecision | null;
};

type Workspace = {
  run_status?: string;
  approved_at?: string;
  completed_at?: string;
  rollback_status?: string;
  rolled_back_at?: string;
  final_import_summary?: {
    ready: boolean;
    blockers: string[];
    profile: { profile_id: string; profile_name: string };
    profile_identity: {
      workbook_username: string;
      target_profile_name: string;
      strategy: "preserve_target" | "apply_workbook_username";
    };
    profile_settings: Array<{ field: string; value: string | number; target: string }>;
    provider_resolutions: Array<ReviewResolution>;
    historical_ep_resolutions: Array<ReviewResolution>;
    accounts: Record<string, string | number>;
    ledgers: Record<string, Record<string, number>>;
    extra_places: Record<string, unknown>;
    financial: {
      open_current_pnl: string;
      settled_pnl: string;
      open_exposure: string;
      review_pnl_impact: string;
      periods: Record<string, {
        workbook_report?: { total?: string };
        difference?: string;
      }>;
    };
    rollback: {
      application_checkpoint: boolean;
      neon_platform_restore: string;
    };
  };
  import_result?: ImportResult;
  execution?: {
    import_run_id: string;
    status: string;
    stage: string;
    completed_units: number;
    total_units: number;
    percentage: number;
    error?: {
      stage?: string;
      category?: string;
      message?: string;
    };
  } | null;
  import_safety?: {
    checkpoint_available?: boolean;
    profile_matches_checkpoint?: boolean;
    profile_matches_post_import?: boolean;
    committed_write_audit_rows?: number;
    no_partial_profile_changes?: boolean;
    retry_available?: boolean;
    manual_changes_detected?: boolean;
    rollback_available?: boolean;
    blocked_reason?: string;
  };
  persistence_preflight?: {
    status?: string;
    workbook_checksum?: string;
    mapping_version?: string;
    completed_at?: string;
    writes_committed?: boolean;
  };
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
  source_summary?: {
    job?: {
      stage: string;
      percentage: number;
      rows_analysed: number;
      total_rows: number;
      estimated_seconds_remaining: number | null;
      error: string;
    };
    ledgers: Record<string, {
      source_rows: number;
      accounted_rows: number;
      open: number;
      settled: number;
      future_settling_open: number;
      open_exposure: string;
    }>;
    accounts?: {
      change_reconciliation?: {
        default_absent_strategy: "leave_unchanged" | "archive" | "deactivate";
        counts: Record<string, number>;
        entries: Array<{
          source_row: number;
          canonical_brand: string;
          account_type: string;
          action: string;
          changes: Array<{ field: string; from: string; to: string }>;
        }>;
        existing_absent_from_workbook: Array<{
          account_id: string;
          account: string;
          type: string;
          current_balance: string;
          status: string;
          planned_action: string;
        }>;
      };
    };
  };
  financial_reconciliation?: Record<"week" | "month" | "year", {
    period_key: string;
    plum_duff_from_mapped_rows: Record<"sportsbook" | "free_bets" | "casino" | "total", string>;
    workbook_report: Record<"sportsbook" | "free_bets" | "casino" | "total", string | null>;
    financial_views: {
      realised_settled_pnl: Record<"sportsbook" | "free_bets" | "casino" | "total", string>;
      open_current_worst_case_pnl: Record<"sportsbook" | "free_bets" | "casino" | "total", string>;
      workbook_equivalent_total: string;
    };
    difference: string | null;
  }>;
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
    pnl_impact_items: Array<{
      item_id: string;
      import_id: string;
      source_sheet: string;
      source_row: number;
      action: string;
      value: string;
    }>;
    row_count_impact: number;
    import_ready: boolean;
    real_import_performed: false;
  };
};

type ReviewResolution = {
  source_sheet: string;
  source_row: number;
  category: string;
  action: string;
  status: string;
  target: string;
  catalogue_id: string;
  note: string;
};

type Comparison = {
  expected: string | number;
  actual: string | number;
  difference: string | number;
};

type PostImportReport = {
  profile: Record<string, string>;
  accounts: Record<string, Comparison>;
  ledgers: Record<string, {
    expected_imported_rows: number;
    actual_persisted_rows: number;
    difference: number;
    open_rows: number;
    settled_rows: number;
    excluded_non_transactional_rows: number;
    duplicate_count: number;
    missing_count: number;
  }>;
  financial_reconciliation: {
    periods: Record<string, { workbook_dry_run: string; post_import: string; difference: string }>;
    views: Record<string, Comparison | string>;
  };
  open_positions: Record<string, Comparison | boolean>;
  review_decisions: Record<string, number>;
  integrity: Record<string, boolean>;
  mismatches: Array<Record<string, unknown>>;
  rollback_available: boolean;
  result: "POST-IMPORT RECONCILIATION: PASSED" | "POST-IMPORT RECONCILIATION: FAILED";
  handoff: Record<string, unknown>;
};

type ImportResult = {
  status?: string;
  import_run_id?: string;
  checkpoint_id?: string;
  profile_settings_updated?: number;
  accounts?: Record<string, number>;
  ledgers?: Record<string, number>;
  rows_imported?: number;
  skipped_non_transactional?: number;
  duration_seconds?: number;
  rollback_available?: boolean;
  post_import_reconciliation?: PostImportReport;
  message?: string;
  safe_state?: string;
  retry_available?: boolean;
  latest_attempt?: {
    attempt_id: string;
    stage: string;
    category: string;
    import_id: string;
    record_id: string;
    exception_type: string;
    failed_at: string;
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

function issueExplanation(item: ReviewItem): string {
  if (item.issue_types.includes("advanced_lay")) return "This row uses a legacy lay arrangement that cannot be reconstructed safely from the available fields.";
  if (item.issue_types.includes("missing_strategy")) return "The workbook does not identify which matching strategy produced this row.";
  if (item.issue_types.includes("text_length")) return "A source value is longer than the current ledger field allows.";
  if (item.issue_types.includes("missing_offer_name")) return "The workbook does not contain an offer name for this casino row.";
  if (item.issue_types.includes("override_missing_reason")) return "The workbook contains a manual override but no reason for it.";
  if (item.category === "missing_provider") return "This account name does not currently match a provider in the global Account Catalogue.";
  if (item.category === "historical_extra_place") return "This historical Extra Place row does not contain all fields required by the current Extra Places ledger.";
  return "One or more source values cannot be mapped safely without a review decision.";
}

function reviewReason(item: ReviewItem): string {
  if (item.category === "missing_provider") return "A global provider relationship must be confirmed before this Profile account can be created.";
  if (item.category === "historical_extra_place") return "You must choose whether to retain it in Sportsbook or preserve it as an incomplete historical Extra Place.";
  if (item.issue_types.includes("advanced_lay") || item.issue_types.includes("missing_strategy")) return "Plum Duff can preserve the source financial outcome, but cannot claim that its current calculator reproduced the bet.";
  if (item.issue_types.includes("text_length")) return "The full source text must be retained while a shorter canonical value is selected.";
  if (item.issue_types.includes("missing_offer_name")) return "The target ledger requires a label, but no marketing name can be inferred safely.";
  return "The importer needs an explicit business decision before this row can be marked ready.";
}

function interpretation(item: ReviewItem): string {
  const pnl = item.context.pnl ? ` The source current/realised P&L of £${item.context.pnl} remains traceable.` : "";
  return `Proposed target: ${item.proposed_target}.${pnl}`;
}

function decisionEffect(action: string, item: ReviewItem): string {
  const effects: Record<string, string> = {
    historical_imported_calculation: "Keeps the row in its proposed ledger, preserves its source financial value, and marks the calculation as imported historical data.",
    preserve_and_shorten: "Keeps the full source text for audit and writes only an approved shortened value to the target field.",
    historical_casino_label: "Keeps the row in Casino and adds the neutral migration-generated label Historical Casino Offer.",
    historical_extra_place: "Creates one incomplete historical Extra Place row, preserves known source values, and leaves unsupported modern fields blank.",
    keep_sportsbook_historical: "Keeps one Sportsbook row with Extra Place classification and does not create a duplicate Extra Place row.",
    map_existing_provider: "Links this Profile account to the selected global provider without changing the workbook.",
    mark_historical_provider: "Preserves the account as historical and records your reason without creating an active catalogue provider.",
    defer: "Leaves the row out of the ready set for now and includes its source P&L in the review impact.",
    exclude: "Excludes the row from the later import and includes its source P&L in the review impact.",
    reclassify: "Moves the proposed destination to the ledger you select and records your reason and source provenance.",
    accept_proposed: "Accepts the proposed target without changing the source financial value or provenance.",
    edit_mapping: "Uses the values you enter for supported target fields while preserving the original source row for audit.",
    provide_override_reason: "Keeps the workbook override and records the reason you provide.",
    remove_override: "Removes the imported override instruction; the source value remains retained for audit.",
    historical_imported_behavior: "Keeps the historical override behaviour without inventing a missing reason.",
    create_provider_candidate: "Records a blocked catalogue candidate only; normal global catalogue validation is still required.",
  };
  return effects[action] ?? `Records this decision against ${item.source_sheet} row ${item.source_row} without modifying the workbook.`;
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
  const body = await response.json().catch(() => null) as {
    detail?: string | { msg?: string }[] | {
      message?: string;
      safe_state?: string;
      stage?: string;
      import_run_id?: string;
    };
  } | null;
  if (typeof body?.detail === "string") return body.detail;
  if (Array.isArray(body?.detail)) return body.detail.map((item) => item.msg ?? "Invalid value").join(". ");
  if (body?.detail && typeof body.detail === "object") {
    return [body.detail.message, body.detail.safe_state, body.detail.stage && `Stage: ${body.detail.stage}`, body.detail.import_run_id && `ImportRun: ${body.detail.import_run_id}`].filter(Boolean).join(". ");
  }
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
  const [resetScope, setResetScope] = useState<"all" | "selected" | null>(null);
  const [approvalAcknowledged, setApprovalAcknowledged] = useState(false);
  const [importConfirmationOpen, setImportConfirmationOpen] = useState(false);
  const [rollbackConfirmationOpen, setRollbackConfirmationOpen] = useState(false);
  const [preflightRequestState, setPreflightRequestState] = useState<PreflightRequestState>("IDLE");
  const editorRef = useRef<HTMLElement | null>(null);
  const filterRef = useRef<HTMLElement | null>(null);
  const loadoutRef = useRef<HTMLDivElement | null>(null);

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
    const refreshExecution = (event: Event) => {
      const detail = event instanceof CustomEvent
        ? event.detail as { importRunId?: string }
        : undefined;
      if (detail?.importRunId && detail.importRunId !== importRunId) return;
      void fetchWorkspaceData(profileId, importRunId)
        .then((result) => {
          setWorkspace(result.review);
          setCatalogue(result.catalogue);
        })
        .catch(() => undefined);
    };
    window.addEventListener(IMPORT_EXECUTION_REFRESH_EVENT, refreshExecution);
    return () => window.removeEventListener(IMPORT_EXECUTION_REFRESH_EVENT, refreshExecution);
  }, [importRunId, profileId]);

  useEffect(() => {
    if (workspace?.run_status !== "ANALYSING") {
      endShellLoading();
      return;
    }
    beginShellLoading();
    const interval = window.setInterval(() => {
      void fetch(`${reviewApi}`, { credentials: "include", cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) throw new Error(await responseMessage(response));
          return response.json() as Promise<Workspace>;
        })
        .then((next) => {
          setWorkspace(next);
          if (next.run_status !== "ANALYSING") {
            endShellLoading();
            window.clearInterval(interval);
            setMessage(next.run_status === "FAILED" ? "Workbook analysis failed." : "Workbook analysis updated. Review decisions remain saved.");
          }
        })
        .catch((caught: unknown) => setMessage(caught instanceof Error ? caught.message : "Unable to refresh workbook analysis."));
    }, 1500);
    return () => {
      window.clearInterval(interval);
      endShellLoading();
    };
  }, [reviewApi, workspace?.run_status]);

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

  function toggleSelected(itemId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function rowInteractionTarget(target: EventTarget | null) {
    return target instanceof Element
      && Boolean(target.closest("a,button,input,select,textarea,label,[role='button'],[contenteditable='true']"));
  }

  async function updateAccountAbsenceStrategy(strategy: string) {
    setSaving(true);
    try {
      const response = await fetch(`${reviewApi}/account-absence-strategy`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy }),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      setWorkspace(await response.json() as Workspace);
      setMessage("Existing Profile Account absence strategy saved.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to save the account strategy.");
    } finally {
      setSaving(false);
    }
  }

  async function updateProfileNameStrategy(strategy: string) {
    setSaving(true);
    try {
      const response = await fetch(`${reviewApi}/profile-name-strategy`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy }),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      setWorkspace(await response.json() as Workspace);
      setMessage(strategy === "preserve_target" ? "Target Profile name will be preserved." : "Workbook username will replace the Profile name when imported.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to save the Profile name strategy.");
    } finally {
      setSaving(false);
    }
  }

  async function saveDecision(advance = false) {
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
      const nextWorkspace = await response.json() as Workspace;
      setWorkspace(nextWorkspace);
      const nextItem = advance
        ? nextWorkspace.items.find((item) => item.review_status === "UNREVIEWED" && item.item_id !== editing.item_id)
        : null;
      setEditing(nextItem ?? null);
      setDraft(nextItem ? initialDraft(nextItem) : null);
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
      const result = await response.json() as Workspace;
      setWorkspace(result);
      setMessage(result.run_status === "ANALYSING" ? "Review reconciliation started. You can leave this page." : "Dry run rerun completed without importing data.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to rerun the dry run.");
    } finally {
      setSaving(false);
    }
  }

  async function resetDecisions() {
    if (!resetScope || !workspace) return;
    setSaving(true);
    try {
      const itemIds = resetScope === "selected"
        ? workspace.items.filter((item) => selected.has(item.item_id) && item.decision).map((item) => item.item_id)
        : [];
      const response = await fetch(`${reviewApi}/decisions/reset`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_ids: itemIds, confirmed: true }),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      setWorkspace(await response.json() as Workspace);
      setSelected(new Set());
      setResetScope(null);
      setMessage(`${itemIds.length ? "Selected" : "All"} review decisions reset. The workbook and Profile data were not changed.`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to reset review decisions.");
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

  async function importWorkbook() {
    if (!workspace?.final_import_summary?.ready) return;
    setSaving(true);
    try {
      const response = await fetch(`${reviewApi}/import`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workbook_checksum: workspace.metadata.workbook_checksum,
          confirmation: "IMPORT WORKBOOK",
        }),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      const result = await response.json() as { status: string };
      if (result.status !== "STARTED") {
        throw new Error("Import execution did not start. No Profile changes were made.");
      }
      await loadWorkspace();
      window.dispatchEvent(new Event(IMPORT_EXECUTION_REFRESH_EVENT));
      setMessage("Import started. It will continue in resumable stages if you leave this page.");
      setImportConfirmationOpen(false);
    } catch (caught) {
      await loadWorkspace();
      setMessage(caught instanceof Error ? caught.message : "Unable to import the workbook safely.");
      setImportConfirmationOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function validateImport() {
    if (!workspace) return;
    setSaving(true);
    setMessage("");
    setPreflightRequestState("VALIDATING");
    beginShellLoading();
    try {
      const response = await fetch(`${reviewApi}/preflight`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workbook_checksum: workspace.metadata.workbook_checksum }),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      const preflight = await response.json() as NonNullable<Workspace["persistence_preflight"]>;
      if (
        preflight.status !== "PASSED"
        || preflight.writes_committed !== false
        || preflight.workbook_checksum !== workspace.metadata.workbook_checksum
        || preflight.mapping_version !== workspace.metadata.mapping_version
      ) {
        throw new Error("Import validation returned an inconsistent result. No Profile changes were made.");
      }
      const refreshed = await fetchWorkspaceData(profileId, importRunId);
      const persistedPreflight = refreshed.review.persistence_preflight;
      if (
        refreshed.review.run_status !== "READY_APPROVED"
        || persistedPreflight?.status !== "PASSED"
        || persistedPreflight.workbook_checksum !== workspace.metadata.workbook_checksum
        || persistedPreflight.mapping_version !== workspace.metadata.mapping_version
      ) {
        throw new Error("Import validation passed but its saved state could not be confirmed. No Profile changes were made.");
      }
      setWorkspace(refreshed.review);
      setCatalogue(refreshed.catalogue);
      setPreflightRequestState("PASSED");
      setMessage("Validation passed. No Profile changes were made.");
    } catch (caught) {
      setPreflightRequestState("FAILED");
      setMessage(caught instanceof Error ? caught.message : "Unable to validate the import safely.");
    } finally {
      endShellLoading();
      setSaving(false);
    }
  }

  async function rollBackImport() {
    setSaving(true);
    try {
      const response = await fetch(`${reviewApi}/rollback`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "ROLL BACK IMPORT" }),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      await loadWorkspace();
      setMessage("Import rolled back and the pre-import Profile checkpoint was restored.");
      setRollbackConfirmationOpen(false);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to roll back this import.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <section className="content-panel stack"><LedgerLoadingIndicator label="Loading Profile import review" /></section>;
  if (error || !workspace) return <section className="content-panel stack"><span className="eyebrow">Import review</span><h1>Unable to load review</h1><p className="error-text" role="alert">{error}</p><button className="button-link" onClick={() => void loadWorkspace()} type="button">Try again</button></section>;

  const ledgerSummaries = Object.values(workspace.source_summary?.ledgers ?? {});
  const accountedRows = ledgerSummaries.reduce((total, ledger) => total + ledger.accounted_rows, 0);
  const sourceRows = ledgerSummaries.reduce((total, ledger) => total + ledger.source_rows, 0);
  const futureOpenRows = ledgerSummaries.reduce((total, ledger) => total + ledger.future_settling_open, 0);
  const annualReconciliation = workspace.financial_reconciliation?.year;
  const job = workspace.source_summary?.job;
  const pnlImpactIsZero = Number(workspace.reconciliation.pnl_impact) === 0;
  const selectedDecisionCount = workspace.items.filter((item) => selected.has(item.item_id) && item.decision).length;
  const accountChanges = workspace.source_summary?.accounts?.change_reconciliation;
  const finalSummary = workspace.final_import_summary;
  const importResult = workspace.import_result;
  const execution = workspace.execution;
  const postImportReport = importResult?.post_import_reconciliation;
  const preflightPassed = workspace.persistence_preflight?.status === "PASSED"
    && workspace.persistence_preflight.workbook_checksum === workspace.metadata.workbook_checksum
    && workspace.persistence_preflight.mapping_version === workspace.metadata.mapping_version;
  const importPresentation = resolveImportRunPresentation({
    approvedAt: workspace.approved_at,
    currentStatus: workspace.run_status,
    preflightPassed,
    reconciliationResult: postImportReport?.result,
    rollbackStatus: workspace.rollback_status,
    rolledBackAt: workspace.rolled_back_at,
  });
  const approvedReadyStatus = importPresentation.approvedReady;
  const canImport = importPresentation.currentRetryable && Boolean(finalSummary?.ready) && workspace.import_safety?.retry_available !== false;
  const currentImportFailed = ["FAILED", "IMPORT_FAILED", "ROLLED_BACK"].includes(workspace.run_status ?? "") && Boolean(workspace.approved_at);
  const canRollback = Boolean(
    importResult?.rollback_available
    && workspace.rollback_status === "AVAILABLE"
    && ["COMPLETE", "POST_IMPORT_RECONCILIATION_FAILED"].includes(workspace.run_status ?? "")
    && workspace.import_safety?.rollback_available !== false
  );

  function downloadReconciliationHandoff() {
    if (!postImportReport) return;
    const blob = new Blob([JSON.stringify(postImportReport.handoff, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `plum-duff-import-${importRunId}-reconciliation.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <>
    <StatusToast message={message} onDismiss={() => setMessage("")} />
    <section className="content-panel stack founder-import-review" data-pd-id="founder-import-review.workspace">
      <header className="sportsbook-page-header">
        <div><span className="eyebrow">Profile workbook</span><h1 className="sportsbook-page-title">Import Review</h1></div>
        <div className="tracker-nav tracker-nav-right">
          <Link className="button-link" href={`/profiles/${profileId}/tracker/settings#import-export`}>Save &amp; leave</Link>
          <button className="button-link icon-text-action" disabled={saving || workspace.run_status === "ANALYSING"} onClick={() => void rerun()} type="button">
            {saving || workspace.run_status === "ANALYSING" ? <span aria-hidden="true" className="button-spinner" /> : <span aria-hidden="true" className="material-symbols-outlined">refresh</span>}
            <span>Rerun dry run</span>
          </button>
        </div>
      </header>
      {workspace.run_status === "ANALYSING" && job ? <section className="content-subpanel stack-tight import-analysis-status" aria-live="polite" data-pd-id="founder-import-review.analysis-progress">
        <div className="workflow-panel-header"><div><strong>{job.stage}</strong><span>{job.total_rows ? `${job.rows_analysed} / ${job.total_rows} rows analysed` : "Analysis continues if you leave this page."}</span></div><span className="table-chip table-chip-info">{job.percentage}%</span></div>
        <div aria-label={`${job.stage}: ${job.percentage}%`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={job.percentage} className="import-analysis-progress" role="progressbar"><span style={{ width: `${job.percentage}%` }} /></div>
      </section> : null}
      {execution?.status === "RUNNING" ? <section aria-busy="true" aria-live="polite" className="content-subpanel stack-tight import-analysis-status" data-pd-id="profile-import.execution-progress">
        <div className="workflow-panel-header"><div><strong>{execution.stage.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (value) => value.toLocaleUpperCase())}</strong><span>{execution.completed_units} / {execution.total_units} planned writes validated or persisted</span></div><span className="table-chip table-chip-info">{execution.percentage}%</span></div>
        <div aria-label={`Import ${execution.stage}: ${execution.percentage}%`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={execution.percentage} className="import-analysis-progress" role="progressbar"><span style={{ width: `${execution.percentage}%` }} /></div>
        <span className="field-support-text">This import is persisted and resumable. You may navigate elsewhere while it continues.</span>
      </section> : null}
      {workspace.run_status === "FAILED" && !workspace.approved_at ? <p className="error-text" role="alert">{job?.error || "Workbook analysis failed. Review the workbook and try again."}</p> : null}
      {preflightRequestState === "VALIDATING" ? <section aria-live="polite" aria-busy="true" className="content-subpanel stack-tight" data-pd-id="profile-import.preflight-validating">
        <LedgerLoadingIndicator label="Validating import plan…" />
        <span className="field-support-text">The approved write plan is being validated with a forced rollback. No Profile changes will be committed.</span>
      </section> : null}
      {preflightPassed && !currentImportFailed ? <section aria-live="polite" className="content-subpanel stack-tight" data-pd-id="profile-import.preflight-passed" role="status">
        <div className="workflow-panel-header"><div><strong>Validation passed</strong><span>No Profile changes were made.</span></div><span className="table-chip table-chip-success">Passed</span></div>
      </section> : null}
      {importPresentation.restoredRetryable ? <section aria-labelledby="import-current-state-title" className="content-subpanel stack-tight" data-pd-id="profile-import.current-state" role="status">
        <header className="workflow-panel-header"><div><span className="eyebrow">Current ImportRun state</span><h2 id="import-current-state-title">{importPresentation.currentStateLabel}</h2></div><span className="table-chip table-chip-success">READY_APPROVED</span></header>
        <p>The previous import attempt was rolled back to its checkpoint. The approved workbook, review decisions and write plan remain unchanged.</p>
        <span className="field-support-text">Rollback complete{workspace.rolled_back_at ? ` · ${new Date(workspace.rolled_back_at).toLocaleString()}` : ""} · validation passed</span>
      </section> : null}
      {currentImportFailed && preflightRequestState !== "VALIDATING" ? <section aria-labelledby="import-execution-failure-title" className="content-subpanel stack-tight" data-pd-id="profile-import.execution-failure" role="alert">
        <span className="eyebrow">Import attempt</span>
        <h2 id="import-execution-failure-title">Import could not be completed</h2>
        <p className="error-text">{importResult?.safe_state || "No Profile changes were committed."}</p>
        <p>{workspace.import_safety?.no_partial_profile_changes ? "The pre-import Profile checkpoint still matches and this approved run can be retried." : "Retry remains blocked until the saved Profile checkpoint is verified."}</p>
        <div className="tracker-nav">
          {preflightPassed ? <button className="button-link icon-text-action" disabled={!canImport || saving} onClick={() => setImportConfirmationOpen(true)} type="button"><span aria-hidden="true" className="material-symbols-outlined">refresh</span><span>Retry import</span></button> : <button className="button-link icon-text-action" disabled={saving || !workspace.import_safety?.retry_available} onClick={() => void validateImport()} type="button"><span aria-hidden="true" className="material-symbols-outlined">fact_check</span><span>Validate retry</span></button>}
          <details className="stack-tight"><summary>Technical/audit details</summary><span>ImportRun: {importRunId}</span><span>Stage: {importResult?.latest_attempt?.stage || "Previous import transaction"}</span><span>Category: {importResult?.latest_attempt?.category || "Safe transaction rollback"}</span>{importResult?.latest_attempt?.import_id ? <span>Import ID: {importResult.latest_attempt.import_id}</span> : null}<span>Committed write audit rows: {workspace.import_safety?.committed_write_audit_rows ?? 0}</span></details>
        </div>
      </section> : null}
      <section className="stat-card-grid import-review-stat-grid import-review-compact-stats" aria-label="Import review status">
        <article className="stat-card"><span className="eyebrow">Remaining</span><strong>{workspace.reconciliation.remaining_partial_count}</strong><span>Require review decisions</span></article>
        <article className="stat-card"><span className="eyebrow">Resolved</span><strong>{workspace.reconciliation.resolved_partial_count}</strong><span>Saved decisions</span></article>
        <article className="stat-card"><span className="eyebrow">Provider conflicts</span><strong>{workspace.metadata.provider_conflict_count}</strong><span>Global catalogue resolution</span></article>
        <article className="stat-card"><span className="eyebrow">Historical EP</span><strong>{workspace.metadata.historical_ep_count}</strong><span>Explicit destination required</span></article>
        <article className="stat-card"><span className="eyebrow">P&amp;L impact</span><strong><FinancialValue animate={false} value={workspace.reconciliation.pnl_impact} /></strong><span>{pnlImpactIsZero ? "£0.00 change to imported P&L" : `${workspace.reconciliation.pnl_impact_items.length} review decisions change imported P&L`}</span></article>
      </section>
      {!pnlImpactIsZero ? <details className="content-subpanel stack-tight import-impact-details" open><summary>Review decisions affecting imported P&amp;L</summary>{workspace.reconciliation.pnl_impact_items.map((item) => <div className="workflow-panel-header" key={item.item_id}><span>{item.source_sheet} row {item.source_row} · {item.action.replaceAll("_", " ")}</span><FinancialValue animate={false} value={item.value} /></div>)}</details> : null}
      {annualReconciliation ? <details className="content-subpanel stack-tight import-financial-reconciliation">
        <summary id="import-financial-reconciliation-title">Financial reconciliation · {accountedRows} / {sourceRows} rows accounted · {futureOpenRows} future-settling open</summary>
        <div className="table-scroll"><table className="data-table"><thead><tr><th scope="col">Period</th><th scope="col">Workbook report</th><th scope="col">Plum Duff equivalent</th><th scope="col">Settled / realised</th><th scope="col">Open current</th><th scope="col">Difference</th></tr></thead><tbody>{(["week", "month", "year"] as const).map((period) => {
          const reconciliation = workspace.financial_reconciliation?.[period];
          if (!reconciliation) return null;
          return <tr key={period}><td><strong>{period[0].toLocaleUpperCase() + period.slice(1)}</strong><span className="table-status">{reconciliation.period_key}</span></td><td><FinancialValue animate={false} value={reconciliation.workbook_report.total ?? "0.00"} /></td><td><FinancialValue animate={false} value={reconciliation.plum_duff_from_mapped_rows.total} /></td><td><FinancialValue animate={false} value={reconciliation.financial_views.realised_settled_pnl.total} /></td><td><FinancialValue animate={false} value={reconciliation.financial_views.open_current_worst_case_pnl.total} /></td><td><FinancialValue animate={false} value={reconciliation.difference ?? "0.00"} /></td></tr>;
        })}</tbody></table></div>
      </details> : null}
      {accountChanges ? <details className="content-subpanel stack-tight import-financial-reconciliation">
        <summary>Profile Account changes · {accountChanges.counts.new_profile_accounts ?? 0} new · {accountChanges.counts.balances_to_update ?? 0} balance updates · {accountChanges.counts.workbook_accounts_not_found_globally ?? 0} unresolved</summary>
        <div className="stack-tight">
          <span className="field-support-text">{accountChanges.counts.workbook_accounts_accounted ?? accountChanges.entries.length} workbook Accounts are represented: {accountChanges.counts.resolved_workbook_accounts ?? 0} resolved and {accountChanges.counts.workbook_accounts_not_found_globally ?? 0} unresolved.</span>
          <span className="field-support-text">Balance updates include point-in-time balance writes for new Accounts, so the New and Balance updates counts can overlap. {accountChanges.counts.balance_writes_for_new_accounts ?? 0} balance writes belong to new Accounts; {accountChanges.counts.balance_updates_for_existing_accounts ?? 0} belong to existing Accounts.</span>
        </div>
        <div className="tracker-nav"><span className="field-support-text">Global provider metadata remains in the Account Catalogue. This plan contains Profile-specific state only.</span><label className="field-control"><span>Accounts absent from workbook</span><select aria-label="Profile Accounts absent from workbook strategy" disabled={saving} onChange={(event) => void updateAccountAbsenceStrategy(event.target.value)} value={accountChanges.default_absent_strategy}><option value="leave_unchanged">Leave unchanged</option><option value="archive">Archive at import</option><option value="deactivate">Deactivate at import</option></select></label></div>
        <div className="table-scroll"><table className="data-table"><thead><tr><th scope="col">Workbook row</th><th scope="col">Provider</th><th scope="col">Type</th><th scope="col">Planned action</th><th scope="col">Changes</th></tr></thead><tbody>{accountChanges.entries.map((entry) => <tr key={`${entry.source_row}-${entry.canonical_brand}`}><td>{entry.source_row}</td><td>{entry.canonical_brand}</td><td><span className="table-chip table-chip-neutral">{entry.account_type}</span></td><td><span className={`table-chip ${entry.action === "blocked" ? "table-chip-danger" : entry.action === "unchanged" ? "table-chip-neutral" : "table-chip-info"}`}>{entry.action}</span></td><td>{entry.changes.length ? entry.changes.map((change) => change.field.replaceAll("_", " ")).join(", ") : "No changes"}</td></tr>)}</tbody></table></div>
        {accountChanges.existing_absent_from_workbook.length ? <p className="field-support-text">{accountChanges.existing_absent_from_workbook.length} existing Profile Accounts are absent from this workbook. The selected strategy is recorded explicitly and is not applied during dry run.</p> : null}
      </details> : null}
      <div aria-label="Import review controls" className="sportsbook-review-bar" role="toolbar">
        <label className="field-control table-search-field"><span className="visually-hidden">Search import exceptions</span><input aria-label="Search import exceptions" onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search import exceptions" type="search" value={search} /></label>
        <div className="extra-place-toolbar-actions">
          <button className="button-link icon-text-action" disabled={!commonBatchIssue} onClick={previewBatch} title={commonBatchIssue ? "Review selected matching rows" : "Select rows sharing a safe batch rule"} type="button"><span aria-hidden="true" className="material-symbols-outlined">library_add_check</span><span>Review selected</span></button>
          <button className="button-link icon-text-action" disabled={!selectedDecisionCount} onClick={() => setResetScope("selected")} type="button"><span aria-hidden="true" className="material-symbols-outlined">restart_alt</span><span>Reset selected</span></button>
          <button className="button-link icon-text-action" disabled={!workspace.reconciliation.valid_decision_count} onClick={() => setResetScope("all")} type="button"><span aria-hidden="true" className="material-symbols-outlined">restart_alt</span><span>Reset review</span></button>
          <div className="table-filter-button-wrap">
            <button aria-haspopup="dialog" aria-label="Filter import review" className={`icon-button table-filter-button${activeFilterCount ? " has-active-table-controls" : ""}`} onClick={() => setFilterOpen(true)} title="Filter import review" type="button"><span aria-hidden="true" className="material-symbols-outlined">filter_alt</span>{activeFilterCount ? <span className="table-filter-badge">{activeFilterCount}</span> : null}</button>
            {activeFilterCount ? <button aria-label="Clear import review filters" className="table-filter-clear" onClick={() => { setStatusFilter(""); setSheetFilter(""); setIssueFilter(""); setPage(1); }} type="button">×</button> : null}
          </div>
        </div>
      </div>
      <div className="extra-place-table-heading-controls import-review-loadout-shell">
        <button aria-label="Scroll review loadouts left" className="icon-button compact-action" onClick={() => loadoutRef.current?.scrollBy({ left: -360, behavior: "smooth" })} type="button"><span aria-hidden="true" className="material-symbols-outlined">chevron_left</span></button>
        <div className="tracker-nav extra-place-loadouts import-review-loadouts" ref={loadoutRef} role="group" aria-label="Import review loadouts">{loadouts.map(([value, label]) => <button aria-pressed={loadout === value} className={`review-chip${loadout === value ? " is-active" : ""}`} key={value} onClick={() => chooseLoadout(value)} type="button">{label}</button>)}</div>
        <button aria-label="Scroll review loadouts right" className="icon-button compact-action" onClick={() => loadoutRef.current?.scrollBy({ left: 360, behavior: "smooth" })} type="button"><span aria-hidden="true" className="material-symbols-outlined">chevron_right</span></button>
      </div>
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
            const isSelected = selected.has(item.item_id);
            return <tr aria-selected={isSelected} className={isSelected ? "is-selected-row" : undefined} key={item.item_id} onClick={(event) => { if (!rowInteractionTarget(event.target)) toggleSelected(item.item_id); }} onKeyDown={(event) => { if (event.key === " " && !rowInteractionTarget(event.target)) { event.preventDefault(); toggleSelected(item.item_id); } }} tabIndex={0}>
              <td><input aria-label={`Select ${item.source_sheet} row ${item.source_row} for review action`} checked={isSelected} onChange={() => toggleSelected(item.item_id)} type="checkbox" /></td>
              <td><strong>{item.source_sheet} · {item.source_row}</strong><span className="table-status">{item.source_record_id || "No source ID"}</span><span className="spreadsheet-row-id" title={item.import_id}>{item.import_id.slice(0, 18)}…</span></td>
              <td>{item.context.provider ? <AccountProviderIdentity fallbackName={item.context.provider} provider={provider} /> : "—"}<span className="table-status import-review-truncate" title={item.context.event || item.context.offer_name}>{item.context.event || item.context.offer_name || "No event label"}</span></td>
              <td><strong>{item.context.offer_type || "—"}</strong><span className="table-status">{[item.context.stake && `Stake ${item.context.stake}`, item.context.odds && `Odds ${item.context.odds}`, item.context.exchange].filter(Boolean).join(" · ") || "No modern bet inputs"}</span></td>
              <td>{item.context.pnl ? <FinancialValue animate={false} value={item.context.pnl} /> : "—"}<span className="table-status">{item.calculation_provenance.replaceAll("_", " ")}</span></td>
              <td><span className="import-review-truncate" title={item.proposed_target}>{item.proposed_target}</span></td>
              <td><span className="table-chip table-chip-warning">{labels[item.issue_type] ?? item.issue_type.replaceAll("_", " ")}</span><span className="table-status import-review-truncate" title={issueExplanation(item)}>{issueExplanation(item)}</span></td>
              <td><span className={`table-chip ${statusClass(item.review_status)}`}>{statusLabels[item.review_status]}</span>{item.decision?.note ? <span className="table-status">{item.decision.note}</span> : null}</td>
              <td><button aria-label={`Review ${item.source_sheet} row ${item.source_row}`} className="icon-button" onClick={() => openEditor(item)} title="Review mapping" type="button"><span aria-hidden="true" className="material-symbols-outlined">edit_note</span></button></td>
            </tr>;
          }) : <tr><td className="empty-cell" colSpan={9}>No import exceptions match the current view.</td></tr>}</tbody>
        </table>
      </LedgerTableScroll>
      <LedgerPagination ariaLabel="Import review" currentPage={effectivePage} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} pageCount={pageCount} pageSize={pageSize} position="bottom" totalRows={filtered.length} />
      <section className="content-subpanel stack-tight" aria-label="Import readiness approval">
        <strong>{workspace.run_status === "READY_APPROVED" ? "Dry run approved" : workspace.reconciliation.import_ready ? "Ready for approval" : "Review required"}</strong>
        <span>{workspace.reconciliation.import_ready ? "Approval locks this reviewed checksum and enables the controlled import summary." : `${workspace.reconciliation.remaining_partial_count} partial rows still require an accepted review decision.`}</span>
        {finalSummary ? <div className="form-grid settings-dialog-form-grid">
          <div><span className="field-label">Workbook username</span><p className="field-support-text">{finalSummary.profile_identity.workbook_username || "Not supplied"}</p></div>
          <label className="field-control"><span>Profile name on import</span><select disabled={saving || Boolean(workspace.approved_at)} onChange={(event) => void updateProfileNameStrategy(event.target.value)} value={finalSummary.profile_identity.strategy}><option value="preserve_target">Preserve {finalSummary.profile_identity.target_profile_name}</option><option value="apply_workbook_username">Use workbook username</option></select></label>
        </div> : null}
        {workspace.reconciliation.import_ready && workspace.run_status !== "READY_APPROVED" ? <div className="tracker-nav">
          <label className="spreadsheet-confirmation-control"><input checked={approvalAcknowledged} onChange={(event) => setApprovalAcknowledged(event.target.checked)} type="checkbox" /><span>{pnlImpactIsZero ? "I confirm this checksum and reconciliation are ready for the later import gate." : `I confirm the ${workspace.reconciliation.pnl_impact} P&L impact caused by the listed review decisions and approve this dry run.`}</span></label>
          <button className="modal-primary-button icon-text-action" disabled={!approvalAcknowledged || saving} onClick={() => void approveReview()} type="button"><span aria-hidden="true" className="material-symbols-outlined">verified</span><span>Approve dry run</span></button>
        </div> : null}
      </section>
      {approvedReadyStatus && finalSummary ? <section className="content-subpanel stack" data-pd-id="profile-import.final-summary">
        <header className="workflow-panel-header"><div><span className="eyebrow">Approved write plan</span><h2>Final import summary</h2></div><span className={`table-chip ${finalSummary.ready ? "table-chip-success" : "table-chip-danger"}`}>{finalSummary.ready ? "Ready" : "Blocked"}</span></header>
        {finalSummary.blockers.length ? <div className="error-text" role="alert">{finalSummary.blockers.map((blocker) => <span key={blocker}>{blocker}</span>)}</div> : null}
        <div className="stat-card-grid import-review-stat-grid import-review-compact-stats" aria-label="Final import counts">
          <article className="stat-card"><span className="eyebrow">Profile settings</span><strong>{finalSummary.profile_settings.length}</strong><span>Fields to update</span></article>
          <article className="stat-card"><span className="eyebrow">Accounts</span><strong>{finalSummary.accounts.total_source ?? 0}</strong><span>{finalSummary.accounts.create ?? finalSummary.accounts.new_profile_accounts ?? 0} new</span></article>
          <article className="stat-card"><span className="eyebrow">Ledger rows</span><strong>{Object.values(finalSummary.ledgers).reduce((total, ledger) => total + (ledger.transactional_rows ?? 0), 0)}</strong><span>Transactional rows planned</span></article>
          <article className="stat-card"><span className="eyebrow">Open current P&amp;L</span><strong><FinancialValue animate={false} value={finalSummary.financial.open_current_pnl} /></strong><span>Worst-case/current cash</span></article>
          <article className="stat-card"><span className="eyebrow">Settled P&amp;L</span><strong><FinancialValue animate={false} value={finalSummary.financial.settled_pnl} /></strong><span>Realised source value</span></article>
        </div>
        <details className="stack-tight"><summary>Profile and Account changes</summary><p>{finalSummary.profile.profile_name} · {finalSummary.profile.profile_id}</p><div className="table-scroll"><table className="data-table"><thead><tr><th scope="col">Measure</th><th scope="col">Planned value</th></tr></thead><tbody>{Object.entries(finalSummary.accounts).map(([name, value]) => <tr key={name}><td>{name.replaceAll("_", " ")}</td><td>{value}</td></tr>)}</tbody></table></div></details>
        <details className="stack-tight"><summary>Ledger write plan</summary><div className="table-scroll"><table className="data-table"><thead><tr><th scope="col">Ledger</th><th scope="col">Source</th><th scope="col">Import</th><th scope="col">Non-transactional</th><th scope="col">Historical / partial</th><th scope="col">Open</th><th scope="col">Settled</th></tr></thead><tbody>{Object.entries(finalSummary.ledgers).map(([name, values]) => <tr key={name}><td>{name.replaceAll("_", " ")}</td><td>{values.source_rows ?? 0}</td><td>{values.transactional_rows ?? 0}</td><td>{values.non_transactional ?? 0}</td><td>{values.historical_or_partial ?? 0}</td><td>{values.open ?? 0}</td><td>{values.settled ?? 0}</td></tr>)}</tbody></table></div></details>
        <details className="stack-tight"><summary>Saved blocking-item resolutions</summary><div className="table-scroll"><table className="data-table"><thead><tr><th scope="col">Source</th><th scope="col">Category</th><th scope="col">Resolution</th><th scope="col">Target</th></tr></thead><tbody>{[...finalSummary.provider_resolutions, ...finalSummary.historical_ep_resolutions].map((resolution) => <tr key={`${resolution.category}-${resolution.source_sheet}-${resolution.source_row}`}><td>{resolution.source_sheet} row {resolution.source_row}</td><td>{resolution.category.replaceAll("_", " ")}</td><td><span className="table-chip table-chip-success">{resolution.action.replaceAll("_", " ")}</span></td><td>{resolution.target || resolution.catalogue_id || "Recorded historical decision"}</td></tr>)}</tbody></table></div></details>
        <details className="stack-tight"><summary>Financial plan</summary><div className="table-scroll"><table className="data-table"><thead><tr><th scope="col">Period</th><th scope="col">Approved total</th><th scope="col">Difference</th></tr></thead><tbody>{Object.entries(finalSummary.financial.periods).map(([period, values]) => <tr key={period}><td>{period}</td><td><FinancialValue animate={false} value={values.workbook_report?.total ?? "0.00"} /></td><td><FinancialValue animate={false} value={values.difference ?? "0.00"} /></td></tr>)}</tbody></table></div></details>
        {finalSummary.ready ? <div className="tracker-nav tracker-nav-right"><button className="modal-primary-button icon-text-action" disabled={!canImport || saving} onClick={() => setImportConfirmationOpen(true)} type="button"><span aria-hidden="true" className="material-symbols-outlined">database_upload</span><span>{importPresentation.importActionLabel}</span></button></div> : approvedReadyStatus ? <div className="tracker-nav tracker-nav-right"><button className="button-link icon-text-action" disabled={saving} onClick={() => void validateImport()} type="button"><span aria-hidden="true" className="material-symbols-outlined">fact_check</span><span>Validate import</span></button></div> : null}
      </section> : null}
      {postImportReport ? <section className="content-subpanel stack" data-pd-id="profile-import.reconciliation">
        <header className="workflow-panel-header"><div><span className="eyebrow">Attempt history</span><h2>{importPresentation.hasPreviousFailedAttempt ? "Previous post-import reconciliation" : "Post-Import Reconciliation"}</h2></div><span className={`table-chip ${postImportReport.result.endsWith("PASSED") ? "table-chip-success" : "table-chip-danger"}`}>{postImportReport.result.replace("POST-IMPORT RECONCILIATION: ", "")}</span></header>
        {importPresentation.restoredRetryable ? <p><strong>Historical failed attempt.</strong> Rollback completed and the current ImportRun is restored, validated and retryable.</p> : null}
        <p>{postImportReport.profile.profile_name} · {postImportReport.profile.workbook_filename} · ImportRunID {postImportReport.profile.import_run_id} · checksum {postImportReport.profile.checksum.slice(0, 12)}…</p>
        <details open><summary>Financial reconciliation</summary><div className="table-scroll"><table className="data-table"><thead><tr><th scope="col">Period</th><th scope="col">Workbook / Dry Run</th><th scope="col">Post Import</th><th scope="col">Difference</th></tr></thead><tbody>{Object.entries(postImportReport.financial_reconciliation.periods).map(([period, values]) => <tr key={period}><td>{period}</td><td><FinancialValue animate={false} value={values.workbook_dry_run} /></td><td><FinancialValue animate={false} value={values.post_import} /></td><td><FinancialValue animate={false} value={values.difference} /></td></tr>)}</tbody></table></div></details>
        <details><summary>Financial views</summary><div className="table-scroll"><table className="data-table"><thead><tr><th scope="col">Measure</th><th scope="col">Expected</th><th scope="col">Actual</th><th scope="col">Difference</th></tr></thead><tbody>{Object.entries(postImportReport.financial_reconciliation.views).map(([name, values]) => typeof values === "string" ? <tr key={name}><td>{name.replaceAll("_", " ")}</td><td colSpan={3}><FinancialValue animate={false} value={values} /></td></tr> : <tr key={name}><td>{name.replaceAll("_", " ")}</td><td><FinancialValue animate={false} value={values.expected} /></td><td><FinancialValue animate={false} value={values.actual} /></td><td><FinancialValue animate={false} value={values.difference} /></td></tr>)}</tbody></table></div></details>
        <details><summary>Accounts · expected vs actual</summary><div className="table-scroll"><table className="data-table"><thead><tr><th scope="col">Measure</th><th scope="col">Expected</th><th scope="col">Actual</th><th scope="col">Difference</th></tr></thead><tbody>{Object.entries(postImportReport.accounts).map(([name, values]) => <tr key={name}><td>{name.replaceAll("_", " ")}</td><td>{values.expected}</td><td>{values.actual}</td><td>{values.difference}</td></tr>)}</tbody></table></div></details>
        <details><summary>Ledgers · persisted rows</summary><div className="table-scroll"><table className="data-table"><thead><tr><th scope="col">Ledger</th><th scope="col">Expected</th><th scope="col">Actual</th><th scope="col">Open</th><th scope="col">Settled</th><th scope="col">Missing</th><th scope="col">Duplicates</th></tr></thead><tbody>{Object.entries(postImportReport.ledgers).map(([name, values]) => <tr key={name}><td>{name.replaceAll("_", " ")}</td><td>{values.expected_imported_rows}</td><td>{values.actual_persisted_rows}</td><td>{values.open_rows}</td><td>{values.settled_rows}</td><td>{values.missing_count}</td><td>{values.duplicate_count}</td></tr>)}</tbody></table></div></details>
        <details><summary>Open positions</summary><div className="table-scroll"><table className="data-table"><thead><tr><th scope="col">Check</th><th scope="col">Expected</th><th scope="col">Actual</th><th scope="col">Difference</th></tr></thead><tbody>{Object.entries(postImportReport.open_positions).map(([name, value]) => typeof value === "boolean" ? <tr key={name}><td>{name.replaceAll("_", " ")}</td><td colSpan={3}><span className={`table-chip ${value ? "table-chip-success" : "table-chip-danger"}`}>{value ? "Passed" : "Failed"}</span></td></tr> : <tr key={name}><td>{name.replaceAll("_", " ")}</td><td>{value.expected}</td><td>{value.actual}</td><td>{value.difference}</td></tr>)}</tbody></table></div></details>
        <details><summary>Review decisions and integrity</summary><div className="table-scroll"><table className="data-table"><thead><tr><th scope="col">Check</th><th scope="col">Value</th></tr></thead><tbody>{Object.entries(postImportReport.review_decisions).map(([name, value]) => <tr key={`decision-${name}`}><td>{name.replaceAll("_", " ")}</td><td>{value}</td></tr>)}{Object.entries(postImportReport.integrity).map(([name, value]) => { const passed = isPostImportIntegrityCheckPassed(name, value); return <tr key={`integrity-${name}`}><td>{name.replaceAll("_", " ")}</td><td><span className={`table-chip ${passed ? "table-chip-success" : "table-chip-danger"}`}>{passed ? "Passed" : "Failed"}</span></td></tr>; })}</tbody></table></div></details>
        {postImportReport.mismatches.length ? <details className="error-text" open><summary>Reconciliation mismatches</summary><pre>{JSON.stringify(postImportReport.mismatches, null, 2)}</pre></details> : null}
        <strong>{postImportReport.result}</strong>
        {workspace.import_safety?.manual_changes_detected ? <div className="content-subpanel stack-tight" role="status"><span className="table-chip table-chip-warning">Rollback locked after Profile changes</span><p>{workspace.import_safety.blocked_reason}</p><p className="field-support-text">The pre-import checkpoint remains stored. Keep this Profile for comparison testing, then archive it and create a fresh Profile for the next workbook snapshot.</p></div> : null}
        <div className="tracker-nav"><Link className="button-link" href={`/profiles/${profileId}`}>Open Profile Dashboard</Link><Link className="button-link" href={`/profiles/${profileId}/tracker/accounts`}>View Accounts</Link><Link className="button-link" href={`/profiles/${profileId}/tracker/sportsbook-bets`}>View imported ledgers</Link><button className="button-link icon-text-action" onClick={downloadReconciliationHandoff} type="button"><span aria-hidden="true" className="material-symbols-outlined">download</span><span>Download reconciliation</span></button>{canRollback ? <button className="button-link destructive-action" onClick={() => setRollbackConfirmationOpen(true)} type="button">Roll back import</button> : null}</div>
      </section> : null}
      <p className="field-support-text">{workspace.metadata.source_filename} · {workspace.metadata.mapping_version} · checksum {workspace.metadata.workbook_checksum.slice(0, 12)}… · {postImportReport ? "persisted import audit available" : "no production import performed"}</p>
    </section>

    {filterOpen && typeof document !== "undefined" ? createPortal(<div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setFilterOpen(false); }}><section aria-labelledby="import-review-filter-title" aria-modal="true" className="modal-panel accounts-filter-modal" ref={filterRef} role="dialog" tabIndex={-1}><header className="modal-sticky-header sportsbook-page-header"><div><span className="eyebrow">Table controls</span><h2 id="import-review-filter-title">Filter import review</h2></div><button aria-label="Close import review filters" className="modal-close-button" onClick={() => setFilterOpen(false)} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button></header><div className="form-grid accounts-filter-form-grid"><label className="field-control"><span>Source sheet</span><select onChange={(event) => { setSheetFilter(event.target.value); setPage(1); }} value={sheetFilter}><option value="">All</option>{[...new Set(workspace.items.map((item) => item.source_sheet))].map((sheet) => <option key={sheet}>{sheet}</option>)}</select></label><label className="field-control"><span>Review state</span><select onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} value={statusFilter}><option value="">All</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field-control"><span>Issue type</span><select onChange={(event) => { setIssueFilter(event.target.value); setPage(1); }} value={issueFilter}><option value="">All</option>{[...new Set(workspace.items.flatMap((item) => item.issue_types))].sort().map((issue) => <option key={issue} value={issue}>{labels[issue] ?? issue.replaceAll("_", " ")}</option>)}</select></label></div><div className="tracker-nav"><button className="review-chip" onClick={() => { setStatusFilter(""); setSheetFilter(""); setIssueFilter(""); setPage(1); }} type="button">Clear filters</button><button className="review-chip review-chip-copy" onClick={() => setFilterOpen(false)} type="button">Done</button></div></section></div>, document.body) : null}

    <ConfirmationDialog
      busy={saving}
      busyLabel="Resetting"
      confirmLabel={resetScope === "selected" ? "Reset selected" : "Reset all decisions"}
      description={`This removes ${resetScope === "selected" ? selectedDecisionCount : workspace.reconciliation.valid_decision_count} saved review decision${(resetScope === "selected" ? selectedDecisionCount : workspace.reconciliation.valid_decision_count) === 1 ? "" : "s"} and restores those items to their original dry-run state. It never changes the source workbook or imported Profile data.`}
      onCancel={() => setResetScope(null)}
      onConfirm={() => void resetDecisions()}
      open={resetScope !== null}
      title="Reset review decisions?"
    />

    <ConfirmationDialog
      busy={saving}
      busyLabel="Importing"
      confirmLabel={importPresentation.importActionLabel}
      confirmTone="primary"
      description={`Import ${workspace.metadata.source_filename} into ${finalSummary?.profile.profile_name ?? "this Profile"} using the approved checksum ${workspace.metadata.workbook_checksum.slice(0, 12)}…. The plan affects ${finalSummary?.accounts.total_source ?? 0} source Accounts and ${Object.values(finalSummary?.ledgers ?? {}).reduce((total, ledger) => total + (ledger.transactional_rows ?? 0), 0)} transactional ledger rows. A scoped rollback checkpoint will be created first.`}
      onCancel={() => setImportConfirmationOpen(false)}
      onConfirm={() => void importWorkbook()}
      open={importConfirmationOpen}
      title="Import approved workbook?"
    />

    <ConfirmationDialog
      busy={saving}
      busyLabel="Rolling back"
      confirmLabel="Roll back import"
      description={`This reverts only writes traced to ImportRunID ${importRunId}, restores prior Profile settings and Account values, removes rows created by this import, and reconciles the restored Profile against its pre-import checkpoint.`}
      onCancel={() => setRollbackConfirmationOpen(false)}
      onConfirm={() => void rollBackImport()}
      open={rollbackConfirmationOpen}
      title="Roll back this import?"
    />

    {editing && draft && typeof document !== "undefined" ? createPortal(
      <div className="modal-backdrop modal-backdrop-elevated" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) { setEditing(null); setDraft(null); } }}>
        <section aria-labelledby="import-review-editor-title" aria-modal="true" className="modal-panel workflow-editor-modal import-review-editor-modal" ref={editorRef} role="dialog" tabIndex={-1}>
          <header className="workflow-panel-header workflow-editor-header">
            <div><span className="eyebrow">{editing.source_sheet} · row {editing.source_row}</span><h2 id="import-review-editor-title">Review import mapping</h2></div>
            <button aria-label="Close import mapping review" className="modal-close-button" disabled={saving} onClick={() => { setEditing(null); setDraft(null); }} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button>
          </header>
          <div className="workflow-editor-body import-review-evidence-body">
            <section className="content-subpanel stack-tight"><span className="eyebrow">What is wrong</span><strong>{labels[editing.issue_type] ?? editing.issue_type.replaceAll("_", " ")}</strong><span>{issueExplanation(editing)}</span></section>
            <section className="content-subpanel stack-tight"><span className="eyebrow">Workbook evidence</span><dl className="spreadsheet-row-details import-review-evidence-grid">
              {[
                ["Source", `${editing.source_sheet} row ${editing.source_row}`],
                ["Provider", editing.context.provider], ["Event", editing.context.event],
                ["Status / result", [editing.context.status, editing.context.result].filter(Boolean).join(" / ")],
                ["Offer / bet type", [editing.context.offer_type, editing.context.bet_type].filter(Boolean).join(" / ")],
                ["Stake", editing.context.stake], ["Back odds", editing.context.odds],
                ["Exchange", editing.context.exchange], ["Lay odds / stake", [editing.context.lay_odds, editing.context.lay_stake].filter(Boolean).join(" / ")],
                ["Current / source P&L", editing.context.pnl ? `£${editing.context.pnl}` : "Not available"],
                ["Notes / strategy", editing.context.notes],
              ].filter(([, value]) => value).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}
            </dl></section>
            <section className="content-subpanel stack-tight"><span className="eyebrow">Plum Duff interpretation</span><span>{interpretation(editing)}</span></section>
            <section className="content-subpanel stack-tight"><span className="eyebrow">Why review is required</span><span>{reviewReason(editing)}</span></section>
            <div className="form-grid">
              <label className="field-control"><span>Decision</span><select onChange={(event) => setDraft((current) => current ? { ...current, action: event.target.value, targetType: event.target.value === "reclassify" ? "Sportsbook Bet" : current.targetType } : current)} value={draft.action}>{optionsFor(editing).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              {draft.action === "map_existing_provider" ? <label className="field-control"><span>Catalogue provider</span><select onChange={(event) => setDraft((current) => current ? { ...current, catalogueId: event.target.value } : current)} value={draft.catalogueId}><option value="">Select provider</option>{catalogue.map((provider) => <option key={provider.catalogue_id} value={provider.catalogue_id}>{provider.brand_name} · {provider.account_type}</option>)}</select></label> : null}
              {draft.action === "reclassify" ? <label className="field-control"><span>Target ledger</span><select onChange={(event) => setDraft((current) => current ? { ...current, targetType: event.target.value } : current)} value={draft.targetType}><option>Sportsbook Bet</option><option>Free Bet</option><option>Casino Offer</option><option>Extra Place</option><option>Mug Bet</option></select></label> : null}
              {draft.action === "edit_mapping" && editing.issue_types.includes("missing_offer_name") ? <label className="field-control"><span>Offer name</span><input onChange={(event) => setDraft((current) => current ? { ...current, offerName: event.target.value } : current)} value={draft.offerName} /></label> : null}
              {draft.action === "edit_mapping" && (editing.issue_types.includes("missing_strategy") || editing.issue_types.includes("advanced_lay")) ? <label className="field-control"><span>Strategy</span><input onChange={(event) => setDraft((current) => current ? { ...current, strategy: event.target.value } : current)} value={draft.strategy} /></label> : null}
              {draft.action === "edit_mapping" && editing.issue_types.includes("text_length") ? <label className="field-control field-span-2"><span>Canonical shortened text</span><textarea maxLength={200} onChange={(event) => setDraft((current) => current ? { ...current, canonicalText: event.target.value } : current)} rows={3} value={draft.canonicalText} /></label> : null}
              <label className="field-control field-span-2"><span>Review note / reason</span><textarea onChange={(event) => setDraft((current) => current ? { ...current, note: event.target.value } : current)} rows={3} value={draft.note} /></label>
            </div>
            <section className="content-subpanel stack-tight"><span className="eyebrow">Decision effect</span><span>{decisionEffect(draft.action, editing)}</span></section>
            {draft.action === "create_provider_candidate" ? <p className="warning-text">This records a blocked candidate decision only. Complete normal catalogue validation before resolving it. <Link href="/settings#catalogue">Open Account Catalogue</Link>.</p> : null}
            <details><summary>Technical details</summary><p>{editing.reason}</p>{editing.missing_fields.length ? <p>Unsupported fields: {editing.missing_fields.join(", ")}.</p> : null}<p className="spreadsheet-row-id">{editing.import_id}</p><dl className="spreadsheet-row-details">{Object.entries(editing.source_fields).filter(([, value]) => value !== "" && value !== null).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{String(value)}</dd></div>)}</dl></details>
          </div>
          <footer className="workflow-editor-footer tracker-nav">
            <button className="button-link" disabled={saving} onClick={() => { setEditing(null); setDraft(null); }} type="button">Cancel</button>
            <button className="button-link icon-text-action" disabled={saving} onClick={() => void saveDecision(true)} type="button"><span aria-hidden="true" className="material-symbols-outlined">skip_next</span><span>Save &amp; next</span></button>
            <button className="modal-primary-button icon-text-action" disabled={saving} onClick={() => void saveDecision()} type="button">{saving ? <span aria-hidden="true" className="button-spinner" /> : <span aria-hidden="true" className="material-symbols-outlined">save</span>}<span>{saving ? "Saving" : "Save decision"}</span></button>
          </footer>
        </section>
      </div>, document.body) : null}

    {batchPreview && typeof document !== "undefined" ? createPortal(<div className="modal-backdrop modal-backdrop-elevated"><section aria-labelledby="import-review-batch-title" aria-modal="true" className="modal-panel import-review-batch-modal stack" role="alertdialog"><header className="workflow-panel-header"><div><span className="eyebrow">Batch review</span><h2 id="import-review-batch-title">Confirm {batchPreview.items.length} decisions</h2></div><button aria-label="Close batch review" className="modal-close-button" disabled={saving} onClick={() => setBatchPreview(null)} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button></header><p><strong>{labels[batchPreview.issue] ?? batchPreview.issue.replaceAll("_", " ")}</strong></p><p>{batchPreview.description}</p><section className="content-subpanel stack-tight"><strong>Representative examples</strong>{batchPreview.items.slice(0, 3).map((item) => <span key={item.item_id}>{item.source_sheet} row {item.source_row} · {item.context.provider || item.context.event || item.source_record_id} · {item.context.stake ? `stake £${item.context.stake}` : "no stake"} · {item.context.pnl ? `P&L £${item.context.pnl}` : "no source P&L"}</span>)}</section><p className="warning-text">This records auditable review decisions only. It does not import or alter workbook rows.</p><div className="tracker-nav"><button className="button-link" disabled={saving} onClick={() => setBatchPreview(null)} type="button">Cancel</button><button className="modal-primary-button icon-text-action" disabled={saving} onClick={() => void applyBatch()} type="button">{saving ? <span aria-hidden="true" className="button-spinner" /> : <span aria-hidden="true" className="material-symbols-outlined">library_add_check</span>}<span>{saving ? "Applying" : "Apply batch rule"}</span></button></div></section></div>, document.body) : null}
  </>;
}
