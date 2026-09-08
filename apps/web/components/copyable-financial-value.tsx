"use client";

import { useEffect, useRef, useState } from "react";

import { FinancialValue } from "@/components/financial-value";
import { formatFinancialValue } from "@/lib/financial-display";

type CopyState = "idle" | "copied" | "failed";
type CopyFeedback = { state: CopyState; valueKey: string };

export function CopyableFinancialValue({
  actionLabel,
  dataPdId,
  disabled = false,
  label,
  onCopy,
  tone = "inherit",
  value,
}: {
  actionLabel?: string;
  dataPdId?: string;
  disabled?: boolean;
  label: string;
  onCopy?: (value: string) => boolean | Promise<boolean>;
  tone?: "auto" | "inherit";
  value: string | number | null | undefined;
}) {
  const [feedback, setFeedback] = useState<CopyFeedback>({ state: "idle", valueKey: "" });
  const resetTimer = useRef<number | null>(null);
  const numericValue = Number(value);
  const available = value !== null && value !== undefined && value !== "" && Number.isFinite(numericValue);
  const canCopy = available && !disabled;
  const formattedValue = available ? formatFinancialValue(numericValue) : "£ -";
  const valueKey = available ? String(value) : "";
  const state = feedback.valueKey === valueKey ? feedback.state : "idle";

  useEffect(() => {
    return () => { if (resetTimer.current !== null) window.clearTimeout(resetTimer.current); };
  }, []);

  async function copy() {
    if (!canCopy) return;
    try {
      const copied = onCopy
        ? await onCopy(String(value))
        : await navigator.clipboard.writeText(String(value)).then(() => true);
      if (!copied) throw new Error("Clipboard write failed");
      setFeedback({ state: "copied", valueKey });
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setFeedback({ state: "idle", valueKey: "" }), 1600);
    } catch {
      setFeedback({ state: "failed", valueKey });
    }
  }

  const status = state === "copied"
    ? `Copied ${formattedValue}`
    : state === "failed"
      ? `Unable to copy ${label}. Select the value and copy it manually.`
      : "";

  return <span className="copyable-financial-value" data-copy-state={state} data-pd-id={dataPdId}>
    <span className="copyable-financial-value-display">
      {available ? <FinancialValue label={label} tone={tone} value={numericValue} /> : "£ -"}
    </span>
    <button
      aria-label={state === "copied" ? `Copied ${formattedValue}` : actionLabel ?? `Copy ${label} ${formattedValue}`}
      className={`icon-button compact-action copyable-financial-value-action${state === "copied" ? " is-success" : ""}`}
      disabled={!canCopy}
      onClick={() => void copy()}
      title={state === "copied" ? "Copied" : actionLabel ?? `Copy ${label}`}
      type="button"
    >
      <span aria-hidden="true" className="material-symbols-outlined">{state === "copied" ? "check" : "content_copy"}</span>
    </button>
    <span aria-live={state === "failed" ? "assertive" : "polite"} className="sr-only" role="status">{status}</span>
  </span>;
}
