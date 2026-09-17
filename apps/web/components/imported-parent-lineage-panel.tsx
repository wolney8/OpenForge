"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { apiBaseUrl } from "@/lib/api";
import { formatHumanDisplayDate } from "@/lib/tracker-summary";

type ParentCandidate = {
  sportsbook_bet_id: string;
  event_name: string;
  bookmaker: string;
  date_settled: string;
  status: string;
  result: string;
};

type ParentReview = {
  free_bet_id: string;
  source_namespace: string;
  source_external_id: string;
  resolution_state: "resolved" | "missing" | "ambiguous" | "legacy_unresolved" | "not_applicable";
  resolved_native_parent_id: string;
  candidates: ParentCandidate[];
};

const stateCopy = {
  resolved: {
    label: "Qualifying bet linked",
    detail: "This Free Bet is linked to a qualifying Sportsbook activity in the same Profile.",
    tone: "table-chip-success",
  },
  missing: {
    label: "Qualifying bet not found",
    detail: "The supplied source identity does not currently match a qualifying bet in this Profile.",
    tone: "table-chip-warning",
  },
  ambiguous: {
    label: "Several possible qualifying bets — review required",
    detail: "Choose the qualifying bet only when the evidence below identifies it clearly.",
    tone: "table-chip-warning",
  },
  legacy_unresolved: {
    label: "Historical link not established",
    detail: "The earlier import did not contain enough evidence to link this Free Bet safely.",
    tone: "table-chip-muted",
  },
  not_applicable: {
    label: "No imported qualifying bet",
    detail: "This row does not carry an imported parent relationship.",
    tone: "table-chip-muted",
  },
} as const;

type ImportedParentLineagePanelProps = {
  freeBetId: string;
  profileId: string;
  onResolved: () => Promise<void> | void;
};

export function ImportedParentLineagePanel({ freeBetId, profileId, onResolved }: ImportedParentLineagePanelProps) {
  const [review, setReview] = useState<ParentReview | null>(null);
  const [selectedParent, setSelectedParent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const operationIdRef = useRef("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${apiBaseUrl}/profiles/${profileId}/free-bets/${freeBetId}/imported-parent-review`,
        { cache: "no-store" }
      );
      if (!response.ok) throw new Error("Qualifying-bet link could not be loaded");
      const next = (await response.json()) as ParentReview;
      setReview(next);
      setSelectedParent(next.resolved_native_parent_id || "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Qualifying-bet link could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [freeBetId, profileId]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(
      `${apiBaseUrl}/profiles/${profileId}/free-bets/${freeBetId}/imported-parent-review`,
      { cache: "no-store", signal: controller.signal }
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("Qualifying-bet link could not be loaded");
        return await response.json() as ParentReview;
      })
      .then((next) => {
        setReview(next);
        setSelectedParent(next.resolved_native_parent_id || "");
        setError("");
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Qualifying-bet link could not be loaded");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [freeBetId, profileId]);

  async function resolveParent() {
    if (!review || saving) return;
    if (!operationIdRef.current) {
      operationIdRef.current = `lineage-${freeBetId}-${crypto.randomUUID()}`;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `${apiBaseUrl}/profiles/${profileId}/free-bets/${freeBetId}/resolve-imported-parent`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            operation_id: operationIdRef.current,
            selected_native_parent_id: selectedParent,
          }),
        }
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(body?.detail || "Qualifying-bet link could not be updated");
      }
      operationIdRef.current = "";
      await load();
      await onResolved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Qualifying-bet link could not be updated");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LedgerLoadingIndicator label="Loading qualifying-bet link" />;
  if (!review) return <p className="field-validation-text" role="alert">{error || "Qualifying-bet link is unavailable."}</p>;
  const copy = stateCopy[review.resolution_state];
  const resolvedCandidate = review.candidates.find(
    (candidate) => candidate.sportsbook_bet_id === review.resolved_native_parent_id
  );

  return (
    <section className="content-subpanel stack imported-parent-lineage" data-pd-id="free-bets.editor.imported-parent-lineage">
      <div className="section-heading-row">
        <div>
          <span className="eyebrow">Qualifying bet</span>
          <h3>Imported relationship</h3>
        </div>
        <span className={`table-chip ${copy.tone}`}>{copy.label}</span>
      </div>
      <p>{copy.detail}</p>
      {resolvedCandidate ? (
        <dl className="lineage-candidate-summary">
          <div><dt>Event</dt><dd>{resolvedCandidate.event_name || "Event not recorded"}</dd></div>
          <div><dt>Bookmaker</dt><dd>{resolvedCandidate.bookmaker || "Not recorded"}</dd></div>
          <div><dt>Status</dt><dd>{resolvedCandidate.status} · {resolvedCandidate.result}</dd></div>
          {resolvedCandidate.date_settled ? <div><dt>Settled</dt><dd>{formatHumanDisplayDate(resolvedCandidate.date_settled, true)}</dd></div> : null}
        </dl>
      ) : null}
      {review.resolution_state === "ambiguous" ? (
        <fieldset className="lineage-candidate-list">
          <legend>Possible qualifying bets</legend>
          {review.candidates.map((candidate) => (
            <label className="lineage-candidate" key={candidate.sportsbook_bet_id}>
              <input
                checked={selectedParent === candidate.sportsbook_bet_id}
                name={`lineage-parent-${freeBetId}`}
                onChange={() => setSelectedParent(candidate.sportsbook_bet_id)}
                type="radio"
              />
              <span><strong>{candidate.event_name || "Event not recorded"}</strong><small>{candidate.bookmaker || "Bookmaker not recorded"} · {candidate.status} · {candidate.result}</small></span>
            </label>
          ))}
        </fieldset>
      ) : null}
      {review.resolution_state !== "resolved" && review.resolution_state !== "not_applicable" ? (
        <div className="settings-action-row">
          <button
            className="button-link"
            disabled={saving || (review.resolution_state === "ambiguous" && !selectedParent)}
            onClick={() => void resolveParent()}
            type="button"
          >
            {saving ? <span aria-hidden="true" className="button-spinner" /> : null}
            {review.resolution_state === "ambiguous" ? "Confirm qualifying bet" : "Check for qualifying bet"}
          </button>
        </div>
      ) : null}
      {error ? <p className="field-validation-text" role="alert">{error}</p> : null}
    </section>
  );
}
