"use client";

import { useState } from "react";

export function PersistedToggle({
  checked,
  dataPdId,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  dataPdId: string;
  disabled?: boolean;
  label: string;
  onChange: (next: boolean) => Promise<boolean>;
}) {
  const [optimisticChecked, setOptimisticChecked] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const displayedChecked = optimisticChecked ?? checked;

  async function toggle() {
    if (disabled || isSaving) return;
    const next = !displayedChecked;
    setOptimisticChecked(next);
    setIsSaving(true);
    await onChange(next).catch(() => false);
    setOptimisticChecked(null);
    setIsSaving(false);
  }

  return (
    <button
      aria-busy={isSaving}
      aria-label={label}
      aria-pressed={displayedChecked}
      className={`material-switch persisted-toggle${displayedChecked ? " is-selected" : ""}`}
      data-pd-id={dataPdId}
      disabled={disabled || isSaving}
      onClick={() => void toggle()}
      type="button"
    >
      <span aria-hidden="true" className="material-switch-track">
        <span className="material-switch-thumb" />
      </span>
      <span>{isSaving ? "Saving" : displayedChecked ? "On" : "Off"}</span>
      {isSaving ? <span aria-hidden="true" className="button-spinner" /> : null}
    </button>
  );
}
