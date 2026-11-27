"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import styles from "@/components/ledger-row-warnings.module.css";
import { focusLedgerWarningField } from "@/lib/ledger-warning-target";

export type LedgerRowWarning = { label: string; message?: string; actionLabel?: string; tone?: "info" | "orange" | "warning" | "danger"; field?: string };

/** DOM elements from a warning row are destroyed while its owned editor replaces the ledger. */
export function useLedgerWarningReturnFocus({ gridId, profileId, ready }: { gridId: string; profileId: string; ready: boolean }) {
  const pending = useRef<{ recordId: string; warning: string; pageX: number; pageY: number; tableX: number; tableY: number } | null>(null);
  const capture = (recordId: string, warning: string) => {
    const grid = document.querySelector<HTMLElement>(`[data-pd-id="${gridId}"]`);
    pending.current = { recordId, warning, pageX: window.scrollX, pageY: window.scrollY,
      tableX: grid?.scrollLeft ?? 0, tableY: grid?.scrollTop ?? 0 };
  };
  useEffect(() => {
    if (!ready || !pending.current) return;
    const frame = requestAnimationFrame(() => {
      const saved = pending.current;
      if (!saved) return;
      pending.current = null;
      const grid = document.querySelector<HTMLElement>(`[data-pd-id="${gridId}"]`);
      if (!grid) return;
      grid.scrollLeft = saved.tableX;
      grid.scrollTop = saved.tableY;
      window.scrollTo({ left: saved.pageX, top: saved.pageY, behavior: "instant" });
      const controlId = `ledger-warnings-${encodeURIComponent(`${profileId}:${saved.recordId}`)}`;
      const trigger = [...grid.querySelectorAll<HTMLButtonElement>('button[aria-controls^="ledger-warnings-"]')]
        .find(button => button.getAttribute("aria-controls") === controlId);
      // A successful correction can move the row out of the active filter/page.
      // In that case, focus the ledger's first available control rather than a stale node.
      (trigger ?? document.querySelector<HTMLElement>('[data-pd-id$=".toolbar.search"]'))?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, gridId, profileId]);
  return { capture };
}

export function useLedgerWarningExpansion(visibleRecordIds: string[]) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});
  const visibleKey = visibleRecordIds.join("\u001f");
  const visibleExpandedId = expandedId && visibleRecordIds.includes(expandedId) ? expandedId : null;
  useEffect(() => {
    if (!expandedId || visibleKey.split("\u001f").includes(expandedId)) return;
    const frame = requestAnimationFrame(() => setExpandedId(null));
    return () => cancelAnimationFrame(frame);
  }, [expandedId, visibleKey]);
  return {
    expandedId: visibleExpandedId,
    toggle: (id: string) => setExpandedId(current => current === id ? null : id),
    close: (id: string) => { setExpandedId(null); requestAnimationFrame(() => triggers.current[id]?.focus({ preventScroll: true })); },
    triggerRef: (id: string) => (node: HTMLButtonElement | null) => { triggers.current[id] = node; },
  };
}

export function LedgerWarningTrigger({ count, open, identity, record, profile, onToggle, triggerRef }: {
  count: number; open: boolean; identity: string; record: string; profile: string; onToggle: () => void; triggerRef?: Ref<HTMLButtonElement>;
}) {
  if (count < 1) return null;
  return <button aria-controls={`ledger-warnings-${encodeURIComponent(identity)}`} aria-expanded={open}
    aria-label={`${open ? "Hide" : "Show"} ${count} recorded ${count === 1 ? "warning" : "warnings"} for ${record}, ${profile}`}
    className={styles.trigger} onClick={event => { event.stopPropagation(); onToggle(); }}
    onKeyDown={event => { if (open && event.key === "Escape") { event.preventDefault(); onToggle(); } }} ref={triggerRef} type="button">
    <span aria-hidden="true" className="material-symbols-outlined">warning</span><span>{count}</span>
  </button>;
}

export function LedgerWarningDetailsRow({ colSpan, open, identity, record, profile, warnings, onReview, onClose }: {
  colSpan: number; open: boolean; identity: string; record: string; profile: string; warnings: LedgerRowWarning[];
  onReview: (warning: LedgerRowWarning) => void; onClose: () => void;
}) {
  if (!warnings.length) return null;
  return <tr aria-hidden={!open} className={styles.detailRow} data-ledger-warning-detail="true"><td colSpan={colSpan}>
    <div className={styles.motion} data-open={open} inert={!open} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); onClose(); } }}>
      <div className={styles.clip}><section aria-label={`Recorded warnings for ${record}, ${profile}`} className={styles.panel}
        id={`ledger-warnings-${encodeURIComponent(identity)}`}>
        <div className={styles.heading}><h3>{record} · {profile} · {warnings.length} {warnings.length === 1 ? "item needs" : "items need"} review</h3>
          <button className={styles.close} onClick={onClose} type="button">Close</button></div>
        <ul className={styles.list}>{warnings.map((warning, index) => <li key={`${warning.label}-${index}`}>
          <span><strong>{warning.label}</strong>{warning.message ? <> · {warning.message}</> : null}</span>
          <button className={styles.action} onClick={() => onReview(warning)} type="button">{warning.actionLabel ?? `Review ${warning.label}`}</button>
        </li>)}</ul>
      </section></div>
    </div>
  </td></tr>;
}

export function LedgerWarningContextNotice({ label, field, instruction }: { label: string; field: string; instruction?: string }) {
  const contextRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    // The entry owns this timer. Closing it or opening another record cancels stale focus.
    const timer = window.setTimeout(() => {
      if (contextRef.current) focusLedgerWarningField(field, contextRef.current);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [field]);
  return <p className={styles.context} data-ledger-warning-context ref={contextRef} role="status" tabIndex={-1}><span aria-hidden="true" className="material-symbols-outlined">warning</span>
    <span><strong>{label}</strong> · {instruction ?? `Review ${field} using this record’s existing controls.`} Saving remains subject to its normal validation and permissions.</span>
  </p>;
}
