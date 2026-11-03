"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { formatApiErrorBody } from "@/lib/api-error";
import styles from "./design-lab-connected.module.css";

export type LedgerCellSession = { column: string; anchor: HTMLElement };

/** Presentation state only. Record drafts and Save remain owned by the native ledger. */
export function useLedgerCellEditor() {
  const [session, setSession] = useState<LedgerCellSession | null>(null);
  return {
    session,
    active: session !== null,
    start: (column: string, anchor: HTMLElement) => setSession({ column, anchor }),
    close: () => setSession(null),
  };
}

export function LedgerFloatingCellEditor({ session, ledger, label, dirty, error, pending = false, children, onSave, onCancel, onReview, readOnly = false, onEnableEditing, enableEditingLabel }: {
  session: LedgerCellSession;
  ledger: string;
  label: string;
  dirty: boolean;
  error: string;
  pending?: boolean;
  children: ReactNode;
  onSave: () => Promise<boolean>;
  onCancel: () => void;
  onReview: () => void;
  readOnly?: boolean;
  onEnableEditing?: () => void;
  enableEditingLabel?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState("");
  const [position, setPosition] = useState({ left: 8, top: 8, width: 360, maxHeight: 400 });
  const errorId = useId();
  const instructionsId = useId();
  const blocked = pending || busy;
  const restore = () => requestAnimationFrame(() => { if (session.anchor.isConnected) session.anchor.focus({ preventScroll: true }); });
  const cancel = () => { if (saving.current || pending) return; onCancel(); restore(); };
  const commit = async (reason: "save" | "outside" | "next" | "previous" = "save") => {
    if (saving.current || pending || readOnly) return;
    if (root.current?.querySelector<HTMLFormElement>("form")?.reportValidity() === false) return;
    saving.current = true; setBusy(true); setUnconfirmed("");
    try {
      const saved = !dirty || await onSave();
      if (!saved) {
        setUnconfirmed("Save is unavailable. Correct the reported fields, retry, or open the full editor.");
        requestAnimationFrame(() => root.current?.querySelector<HTMLElement>("input,textarea,select")?.focus());
        return;
      }
      if (!dirty) onCancel();
      if (reason === "outside") session.anchor.removeAttribute("data-ledger-selected");
      else requestAnimationFrame(() => {
        if (!session.anchor.isConnected) return;
        session.anchor.focus({ preventScroll: true });
        if (reason === "next" || reason === "previous") session.anchor.dispatchEvent(new KeyboardEvent("keydown", { key: reason === "next" ? "ArrowRight" : "ArrowLeft", bubbles: true }));
      });
    } catch {
      setUnconfirmed("Save was not confirmed. Your draft is retained; retry saving.");
      requestAnimationFrame(() => root.current?.querySelector<HTMLElement>("input,textarea,select")?.focus());
    }
    finally { saving.current = false; setBusy(false); }
  };
  useLayoutEffect(() => {
    const update = () => {
      const cell = session.anchor.getBoundingClientRect();
      const viewportWidth = Math.min(document.documentElement.clientWidth, document.body.clientWidth);
      const width = Math.min(viewportWidth - 16, Math.max(360, Math.min(cell.width, 520)));
      const height = Math.min(root.current?.offsetHeight ?? 240, window.innerHeight - 16);
      setPosition({ left: Math.max(8, Math.min(cell.left, viewportWidth - width - 8)), top: Math.max(8, Math.min(cell.top, window.innerHeight - height - 8)), width, maxHeight: window.innerHeight - 16 });
    };
    update();
    const observer = new ResizeObserver(update); if (root.current) observer.observe(root.current);
    window.addEventListener("resize", update); window.addEventListener("scroll", update, true);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [session.anchor]);
  useEffect(() => {
    const target = root.current?.querySelector<HTMLElement>('input:not(:disabled),textarea:not(:disabled),select:not(:disabled),button[data-initial-focus]');
    target?.focus(); if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) target.select();
  }, []);
  useEffect(() => {
    let suppress = false;
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || root.current?.contains(event.target) || session.anchor.contains(event.target) || document.querySelector("dialog[open]")) return;
      if (!dirty && !saving.current && !pending) { onCancel(); return; }
      event.preventDefault(); event.stopImmediatePropagation(); suppress = true;
      if (!saving.current && !pending) void commit("outside");
    };
    const click = (event: MouseEvent) => { if (suppress) { suppress = false; event.preventDefault(); event.stopImmediatePropagation(); } };
    const release = () => requestAnimationFrame(() => { suppress = false; });
    document.addEventListener("pointerdown", outside, true); document.addEventListener("click", click, true); document.addEventListener("pointerup", release, true);
    return () => { document.removeEventListener("pointerdown", outside, true); document.removeEventListener("click", click, true); document.removeEventListener("pointerup", release, true); };
  });
  const message = error ? formatApiErrorBody(error, "Unable to save this field.") : unconfirmed;
  return createPortal(<div aria-label={`Edit ${ledger} ${label}`} aria-busy={blocked} aria-describedby={instructionsId} className={`${styles.floatingCellEditor} content-subpanel stack-tight ledger-floating-cell-editor`} data-pd-id="ledger.floating-editor" ref={root} role="group" style={position} onKeyDown={event => {
    if (event.defaultPrevented) return;
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); cancel(); }
    if (event.altKey && event.key === "Enter" && !blocked) { event.preventDefault(); session.anchor.focus({ preventScroll: true }); onReview(); }
    const plainField = event.target instanceof Element && event.target.matches('input:not([role="combobox"]),textarea');
    if (plainField && event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void commit(); }
    if (plainField && event.key === "Tab") { event.preventDefault(); void commit(event.shiftKey ? "previous" : "next"); }
  }}>
    <div className="workflow-panel-header"><strong>{label}</strong><button data-pd-id="ledger.floating-editor.cancel" aria-label={`Cancel ${ledger} ${label} edit`} className="modal-close-button" disabled={blocked} onClick={cancel} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button></div>
    {readOnly ? <p className="muted" role="status">Read-only row. Choose Edit to enable this field.</p> : null}
    <form onChange={() => setUnconfirmed("")} onSubmit={event => { event.preventDefault(); void commit(); }}>
      <fieldset data-pd-id="ledger.floating-editor.fields" aria-describedby={message ? errorId : undefined} className="ledger-floating-fields" disabled={blocked || readOnly}>{children}</fieldset>
      {message ? <p className="error-text" id={errorId} role="alert">{message}</p> : null}
      <div className="table-action-row"><button data-pd-id="ledger.floating-editor.full" aria-keyshortcuts="Alt+Enter" className="review-chip" disabled={blocked} onClick={() => { session.anchor.focus({ preventScroll: true }); onReview(); }} type="button">Open full editor</button>{readOnly && onEnableEditing ? <button data-pd-id="ledger.floating-editor.enable" aria-label={enableEditingLabel ?? `Edit ${ledger} row`} className="review-chip" data-initial-focus disabled={blocked} onClick={() => { onEnableEditing(); requestAnimationFrame(() => root.current?.querySelector<HTMLElement>("input,textarea,select")?.focus()); }} type="button">Edit</button> : null}<button data-pd-id="ledger.floating-editor.save" className="modal-primary-button" disabled={blocked || readOnly} type="submit">{blocked ? <><span aria-hidden="true" className="button-spinner"/>Saving</> : "Save"}</button></div>
    </form>
    <span className="sr-only" id={instructionsId}>Save commits this field. Escape cancels after nested choices close. In text fields, Enter saves and Tab saves and moves between cells. Alt+Enter opens the full editor with this draft.</span>
  </div>, document.body);
}
