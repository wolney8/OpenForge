"use client";

import { useId, useState } from "react";

export function ContextHelp({ label, text }: { label: string; text: string }) {
  const helpId = useId();
  const [open, setOpen] = useState(false);

  return (
    <span className={`context-help${open ? " is-open" : ""}`}>
      <button
        aria-describedby={helpId}
        aria-expanded={open}
        aria-label={label}
        className="icon-action context-help-action"
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span aria-hidden="true">?</span>
      </button>
      <span className="action-tooltip context-help-tooltip" id={helpId} role="tooltip">
        {text}
      </span>
    </span>
  );
}
