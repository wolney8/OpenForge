"use client";

import { useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Temporary cell feedback. The owning ledger still decides whether a write is allowed. */
export function LedgerCellReviewPopover({ anchor, reason, onReview, onDismiss, dataPdId, portalTarget }: {
  anchor: HTMLElement;
  reason: string;
  onReview: () => void;
  onDismiss: (restoreFocus: boolean) => void;
  dataPdId: string;
  portalTarget?: HTMLElement;
}) {
  const root = useRef<HTMLDivElement>(null);
  const action = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ left: 8, top: 8, width: 280 });
  const dismiss = useEffectEvent(onDismiss);

  useLayoutEffect(() => {
    const update = () => {
      if (!anchor.isConnected) { dismiss(false); return; }
      const cell = anchor.getBoundingClientRect();
      const width = Math.min(280, window.innerWidth - 16);
      const height = root.current?.getBoundingClientRect().height ?? 112;
      const below = cell.bottom + 6;
      const top = below + height <= window.innerHeight - 8 ? below : Math.max(8, cell.top - height - 6);
      setPosition({ left: Math.max(8, Math.min(cell.left, window.innerWidth - width - 8)), top, width });
    };
    anchor.setAttribute("data-ledger-review", "true");
    update();
    const observer = new ResizeObserver(update);
    if (root.current) observer.observe(root.current);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target) && !anchor.contains(event.target)) dismiss(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); dismiss(true); }
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape, true);
    action.current?.focus({ preventScroll: true });
    return () => {
      anchor.removeAttribute("data-ledger-review");
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", escape, true);
    };
  }, [anchor]);

  return createPortal(<div aria-label="Cell edit requires record review" className="ledger-cell-review-popover" data-pd-id={dataPdId} ref={root} role="group" style={position}>
    <p role="status"><span aria-hidden="true" className="material-symbols-outlined">warning</span>{reason}</p>
    <button className="button-link" onClick={() => { onDismiss(false); onReview(); }} ref={action} type="button">Open record for review</button>
  </div>, portalTarget ?? document.body);
}
