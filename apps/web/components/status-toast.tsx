"use client";

import { inferStatusToastTone, type StatusToastTone } from "@/lib/status-toast";

type StatusToastProps = {
  message: string;
  onDismiss?: () => void;
  tone?: StatusToastTone;
};

export function StatusToast({ message, onDismiss, tone }: StatusToastProps) {
  if (!message || message.startsWith("Loading ")) {
    return null;
  }

  const resolvedTone = tone ?? inferStatusToastTone(message);

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
