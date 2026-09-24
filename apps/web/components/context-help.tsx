"use client";

import { useId, useRef, useState } from "react";

export function ContextHelp({ label, text }: { label: string; text: string }) {
  const helpId = useId();
  const [open, setOpen] = useState(false);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const containTooltip = () => {
    const tooltip = tooltipRef.current;
    if (!tooltip) return;
    // Retain the shared anchor; translate only if that anchor clips the viewport.
    tooltip.style.translate = "0px";
    const bounds = tooltip.getBoundingClientRect();
    const gutter = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const shift = bounds.left < gutter ? gutter - bounds.left
      : bounds.right > window.innerWidth - gutter ? window.innerWidth - gutter - bounds.right : 0;
    tooltip.style.translate = shift + "px";
  };

  return (
    <span className={`context-help${open ? " is-open" : ""}`} onMouseEnter={containTooltip} onFocus={containTooltip}>
      <button
        aria-describedby={helpId}
        aria-expanded={open}
        aria-label={label}
        className="icon-action context-help-action"
        onBlur={() => setOpen(false)}
        onClick={() => { containTooltip(); setOpen((current) => !current); }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
          }
        }}
        type="button"
      >
        <span aria-hidden="true" className="material-symbols-outlined">help</span>
      </button>
      <span className="action-tooltip context-help-tooltip" id={helpId} ref={tooltipRef} role="tooltip">
        {text}
      </span>
    </span>
  );
}
