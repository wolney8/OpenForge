"use client";

import { useEffect, useId, useRef, useState } from "react";

export function ConfirmationDialog({
  busy = false,
  busyLabel = "Removing",
  cancelLabel = "Cancel",
  confirmLabel,
  confirmTone = "destructive",
  confirmationText,
  confirmationLabel = "Type to confirm",
  description,
  error,
  onCancel,
  onConfirm,
  open,
  title,
}: {
  busy?: boolean;
  busyLabel?: string;
  cancelLabel?: string;
  confirmLabel: string;
  confirmTone?: "destructive" | "primary";
  confirmationText?: string;
  confirmationLabel?: string;
  description: string;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const [typedConfirmation, setTypedConfirmation] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const confirmationMatches =
    confirmationText === undefined || typedConfirmation === confirmationText;

  return (
    <dialog
      aria-labelledby={titleId}
      className="confirmation-dialog"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      onClose={() => setTypedConfirmation("")}
      ref={dialogRef}
    >
      <div className="stack">
        <h2 id={titleId}>{title}</h2>
        <p>{description}</p>
        {error ? <p className="error-text" role="alert">{error}</p> : null}
        {confirmationText !== undefined ? (
          <label className="field-control confirmation-dialog-input">
            <span>{confirmationLabel}</span>
            <input
              autoComplete="off"
              disabled={busy}
              onChange={(event) => setTypedConfirmation(event.target.value)}
              value={typedConfirmation}
            />
            <small>Enter <strong>{confirmationText}</strong> exactly.</small>
          </label>
        ) : null}
        <div className="tracker-nav tracker-nav-right">
          <button className="button-link" disabled={busy} onClick={onCancel} type="button">{cancelLabel}</button>
          <button
            className={confirmTone === "primary" ? "modal-primary-button" : "button-link destructive-action"}
            disabled={busy || !confirmationMatches}
            onClick={onConfirm}
            type="button"
          >
            {busy ? <span aria-hidden="true" className="button-spinner" /> : null}
            <span>{busy ? busyLabel : confirmLabel}</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
