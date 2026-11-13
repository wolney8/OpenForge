"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { DesignLabSelect } from "@/components/design-lab-select";
import { designTodayDetailActionsClass, designTodayStateEditorClass } from "@/components/design-today-task-row";
import { loadTaskAnnotations, patchTaskAnnotations, registerPendingTaskAnnotationFlush, type TaskAnnotation, type TaskAnnotationChange, type TaskWorkState } from "@/lib/task-annotations";

type Draft = {
  tracked: boolean;
  work_state: TaskWorkState;
  blocked_reason: string;
  review_date: string;
  next_action: string;
  notes: string;
  reviewed: boolean;
};

function fromRow(row: TaskAnnotation | null): Draft {
  return {
    tracked: row?.tracked ?? false,
    work_state: row?.work_state ?? "To Do",
    blocked_reason: row?.blocked_reason ?? "",
    review_date: row?.review_date ?? "",
    next_action: row?.next_action ?? "",
    notes: row?.notes ?? "",
    reviewed: Boolean(row?.reviewed_at),
  };
}

function keepOnlyLocalEdits(row: TaskAnnotation, draft: Draft, dirty: Set<keyof Draft>): Draft {
  const fresh = fromRow(row);
  return {
    tracked: dirty.has("tracked") ? draft.tracked : fresh.tracked,
    work_state: dirty.has("work_state") ? draft.work_state : fresh.work_state,
    blocked_reason: dirty.has("blocked_reason") ? draft.blocked_reason : fresh.blocked_reason,
    review_date: dirty.has("review_date") ? draft.review_date : fresh.review_date,
    next_action: dirty.has("next_action") ? draft.next_action : fresh.next_action,
    notes: dirty.has("notes") ? draft.notes : fresh.notes,
    reviewed: dirty.has("reviewed") ? draft.reviewed : fresh.reviewed,
  };
}

export type OpportunityPersonalReviewHandle = { flush: () => Promise<boolean> };

/** One serial, versioned write queue for an opportunity's personal fields and membership. */
export const OpportunityPersonalReview = forwardRef<OpportunityPersonalReviewHandle, {
  annotation: TaskAnnotation | null;
  occurrenceKey: string;
  profileId: string;
  sourceAvailable: boolean;
  onAcknowledged: (rows: TaskAnnotation[]) => void;
}>(function OpportunityPersonalReview({ annotation, occurrenceKey, profileId, sourceAvailable, onAcknowledged }, ref) {
  const [draft, setDraft] = useState<Draft>(() => fromRow(annotation));
  const [status, setStatus] = useState<"idle" | "unsaved" | "saving" | "saved" | "failed" | "needs-date">("idle");
  const [error, setError] = useState("");
  const [actionFeedback, setActionFeedback] = useState("");
  const draftRef = useRef(draft);
  const acknowledgedRef = useRef<TaskAnnotation | null>(annotation);
  const revisionRef = useRef(0);
  const savedRevisionRef = useRef(0);
  const runningRef = useRef<Promise<boolean> | null>(null);
  const flushDelegateRef = useRef<() => Promise<boolean>>(async () => true);
  const debounceRef = useRef<number | null>(null);
  const dirtyFieldsRef = useRef(new Set<keyof Draft>());

  useEffect(() => {
    if (!annotation || (acknowledgedRef.current?.version ?? -1) >= annotation.version) return;
    acknowledgedRef.current = annotation;
    if (revisionRef.current === savedRevisionRef.current && !runningRef.current) {
      const next = fromRow(annotation);
      draftRef.current = next;
      setDraft(next);
      dirtyFieldsRef.current.clear();
    } else {
      // Carry external writes into fields this draft has not changed.
      const next = keepOnlyLocalEdits(annotation, draftRef.current, dirtyFieldsRef.current);
      draftRef.current = next;
      setDraft(next);
    }
  }, [annotation]);

  const flush = async (): Promise<boolean> => {
    if (debounceRef.current !== null) { window.clearTimeout(debounceRef.current); debounceRef.current = null; }
    if (runningRef.current) {
      const completed = await runningRef.current;
      if (!completed) return false;
      return savedRevisionRef.current < revisionRef.current ? flush() : true;
    }
    const run = async () => {
      while (savedRevisionRef.current < revisionRef.current) {
        const revision = revisionRef.current;
        const desired = { ...draftRef.current };
        if (desired.work_state === "Do Later" && !/^\d{4}-\d{2}-\d{2}$/.test(desired.review_date)) {
          setStatus("needs-date");
          return false;
        }
        if (desired.reviewed && !sourceAvailable && !acknowledgedRef.current?.reviewed_at) {
          setStatus("failed");
          setError("The source is no longer current. Review its history before marking it reviewed.");
          return false;
        }
        setStatus("saving");
        const previous = acknowledgedRef.current;
        const change: TaskAnnotationChange = {
          profile_id: profileId, occurrence_key: occurrenceKey,
          tracked: desired.tracked, work_state: desired.work_state,
          blocked_reason: desired.work_state === "Blocked" ? desired.blocked_reason.trim() || null : null,
          review_date: desired.work_state === "Do Later" ? desired.review_date : null,
          next_action: desired.next_action.trim() || null,
          notes: desired.notes.trim() || null,
          reviewed: desired.reviewed,
          expected_version: previous?.version ?? 0,
        };
        const result = await patchTaskAnnotations([change]);
        const saved = result.rows?.find(row => row.profile_id === profileId && row.occurrence_key === occurrenceKey);
        if (!saved) {
          const latest = await loadTaskAnnotations();
          if (latest) {
            const current = latest.find(row => row.profile_id === profileId && row.occurrence_key === occurrenceKey) ?? null;
            acknowledgedRef.current = current;
            if (current) {
              const retained = keepOnlyLocalEdits(current, draftRef.current, dirtyFieldsRef.current);
              draftRef.current = retained;
              setDraft(retained);
            }
          }
          setError(result.error ?? "The personal review could not be confirmed. Retry your unsaved changes.");
          setStatus("failed");
          return false;
        }
        acknowledgedRef.current = saved;
        savedRevisionRef.current = revision;
        onAcknowledged([saved]);
        setError("");
        if (revisionRef.current === revision) {
          if (dirtyFieldsRef.current.has("tracked")) setActionFeedback(saved.tracked ? "Tracked" : "Untracked");
          else if (dirtyFieldsRef.current.has("reviewed")) setActionFeedback(saved.reviewed_at ? "Reviewed" : "Reopened");
          const accepted = fromRow(saved);
          draftRef.current = accepted;
          setDraft(accepted);
          dirtyFieldsRef.current.clear();
          setStatus("saved");
          return true;
        }
      }
      return true;
    };
    const pending = run();
    runningRef.current = pending;
    try { return await pending; }
    finally { if (runningRef.current === pending) runningRef.current = null; }
  };

  useEffect(() => { flushDelegateRef.current = flush; });
  useEffect(() => registerPendingTaskAnnotationFlush(profileId, occurrenceKey, () => flushDelegateRef.current()), [profileId, occurrenceKey]);

  useImperativeHandle(ref, () => ({ flush }));
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (revisionRef.current === savedRevisionRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => { window.removeEventListener("beforeunload", guard); if (debounceRef.current !== null) window.clearTimeout(debounceRef.current); };
  }, []);

  const update = (patch: Partial<Draft>, immediate = false) => {
    for (const key of Object.keys(patch) as Array<keyof Draft>) dirtyFieldsRef.current.add(key);
    const next = { ...draftRef.current, ...patch };
    draftRef.current = next;
    setDraft(next);
    revisionRef.current += 1;
    setError("");
    setActionFeedback("");
    setStatus("unsaved");
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    if (immediate) void flush();
    else debounceRef.current = window.setTimeout(() => void flush(), 550);
  };
  const acknowledgedReviewed = Boolean(acknowledgedRef.current?.reviewed_at);
  const persistedReview = Boolean(acknowledgedRef.current?.next_action || acknowledgedRef.current?.notes || acknowledgedRef.current?.reviewed_at);

  return <section aria-label="Personal opportunity review" className={designTodayStateEditorClass} data-pd-id="opportunity.personal-review">
    <label>Next action<input aria-label="Personal Next action" data-pd-id="opportunity.next-action" maxLength={240} onBlur={() => void flush()} onChange={event => update({ next_action: event.target.value })} placeholder="What will you check next?" value={draft.next_action} /></label>
    <label>Notes<textarea aria-label="Personal Notes" data-pd-id="opportunity.notes" maxLength={4000} onBlur={() => void flush()} onChange={event => update({ notes: event.target.value })} placeholder="Private notes about your review" rows={4} value={draft.notes} /></label>
    <DesignLabSelect dataPdId="opportunity.work-state" label="Personal work state" onChange={value => {
      const work_state = value as TaskWorkState;
      update({ work_state, blocked_reason: work_state === "Blocked" ? draftRef.current.blocked_reason : "", review_date: work_state === "Do Later" ? draftRef.current.review_date : "" }, true);
    }} options={(["To Do", "In Progress", "Blocked", "Do Later"] as TaskWorkState[]).map(value => ({ value, label: value }))} value={draft.work_state} />
    {draft.work_state === "Blocked" ? <label>Blocked reason<input aria-label="Personal blocked reason" maxLength={500} onBlur={() => void flush()} onChange={event => update({ blocked_reason: event.target.value })} value={draft.blocked_reason} /></label> : null}
    {draft.work_state === "Do Later" ? <label>Review / resume date<input aria-label="Personal review date" onBlur={() => void flush()} onChange={event => update({ review_date: event.target.value }, Boolean(event.target.value))} type="date" value={draft.review_date} /></label> : null}
    <p aria-live="polite" data-pd-id="opportunity.save-status" role="status">{status === "unsaved" ? "Unsaved changes" : status === "saving" ? "Saving personal review…" : status === "saved" || status === "idle" && persistedReview ? "Personal review saved" : status === "needs-date" ? "Choose a valid review date before saving Do Later." : status === "failed" ? "Personal review was not saved." : ""}</p>
    {actionFeedback && status === "saved" ? <p aria-live="polite" role="status">{actionFeedback}</p> : null}
    {status === "failed" ? <p role="alert">{error} <button onClick={() => void flush()} type="button">Retry personal review</button></p> : null}
    <div className={designTodayDetailActionsClass}>
      <button aria-busy={status === "saving"} aria-pressed={Boolean(acknowledgedRef.current?.tracked)} data-pd-id="opportunity.track" disabled={(!sourceAvailable && !draft.tracked) || status === "saving" || (acknowledgedReviewed && !draft.tracked)} onClick={() => update({ tracked: !draft.tracked }, true)} type="button">{status === "saving" && draft.tracked !== Boolean(acknowledgedRef.current?.tracked) ? <span aria-hidden="true" className="material-symbols-outlined opportunity-action-progress">progress_activity</span> : null}{acknowledgedRef.current?.tracked ? "Untrack" : "Track"}</button>
      {acknowledgedReviewed ? <button aria-busy={status === "saving"} data-pd-id="opportunity.reopen" disabled={status === "saving"} onClick={() => update({ reviewed: false }, true)} type="button">{status === "saving" && !draft.reviewed ? <span aria-hidden="true" className="material-symbols-outlined opportunity-action-progress">progress_activity</span> : null}Reopen</button> : <button aria-busy={status === "saving"} data-pd-id="opportunity.mark-reviewed" disabled={!sourceAvailable || status === "saving"} onClick={() => update({ reviewed: true }, true)} type="button">{status === "saving" && draft.reviewed ? <span aria-hidden="true" className="material-symbols-outlined opportunity-action-progress">progress_activity</span> : null}Mark reviewed</button>}
    </div>
  </section>;
});
