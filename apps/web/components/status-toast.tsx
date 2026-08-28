"use client";

import { useEffect } from "react";

import { inferStatusToastTone, type StatusToastTone } from "@/lib/status-toast";

type StatusToastProps = {
  message: string;
  onDismiss?: () => void;
  tone?: StatusToastTone;
  durationMs?: number;
};

export function StatusToast({ durationMs, message, onDismiss, tone }: StatusToastProps) {
  const resolvedTone = tone ?? inferStatusToastTone(message);

  useEffect(() => {
    if (!message || !onDismiss) return;
    const timeoutId = window.setTimeout(
      onDismiss,
      durationMs ?? (resolvedTone === "error" ? 8000 : 5000),
    );
    return () => window.clearTimeout(timeoutId);
  }, [durationMs, message, onDismiss, resolvedTone]);

  if (!message || message.startsWith("Loading ")) {
    return null;
  }

  return (
    <div
      aria-live={resolvedTone === "error" ? "assertive" : "polite"}
      className={`status-toast status-toast-${resolvedTone}`}
      role={resolvedTone === "error" ? "alert" : "status"}
    >
      <span className="status-toast-message">{message}</span>
      {onDismiss ? (
        <button
          aria-label="Dismiss notification"
          className="status-toast-dismiss"
          onClick={onDismiss}
          type="button"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
