"use client";

import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatCompactLedgerDate } from "@/lib/ledger-compact-date";

/** Display only: the source timestamp remains the sorting, filter and edit authority. */
export function LedgerCompactDate({ value, fallback = "Not recorded" }: { value: string | null | undefined; fallback?: string }) {
  const id = useId();
  const ref = useRef<HTMLTimeElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const date = formatCompactLedgerDate(value);
  if (!date) return <span className="ledger-compact-date ledger-compact-date-missing">{fallback}</span>;
  const show = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) setPosition({ left: Math.min(rect.left, Math.max(12, window.innerWidth - 320)), top: Math.min(rect.bottom + 6, window.innerHeight - 60) });
  };
  return <>
    <time
      aria-describedby={position ? id : undefined}
      aria-label={date.full}
      className="ledger-compact-date"
      dateTime={value ?? undefined}
      onBlur={() => setPosition(null)}
      onFocus={show}
      onMouseEnter={show}
      onMouseLeave={() => { if (document.activeElement !== ref.current) setPosition(null); }}
      onTouchStart={() => { ref.current?.focus(); show(); }}
      ref={ref}
      tabIndex={0}
    >{date.compact}</time>
    {position && typeof document !== "undefined" ? createPortal(<span className="ledger-date-tooltip" id={id} role="tooltip" style={position}>{date.full}</span>, document.body) : null}
  </>;
}
