"use client";

import { useEffect, useId, useRef } from "react";

export function ConfirmationDialog({
  busy = false,
  busyLabel = "Removing",
  cancelLabel = "Cancel",
  confirmLabel,
  confirmTone = "destructive",
  description,
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
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      aria-labelledby={titleId}
      className="confirmation-dialog"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      ref={dialogRef}
    >
      <div className="stack">
        <h2 id={titleId}>{title}</h2>
        <p>{description}</p>
        <div className="tracker-nav tracker-nav-right">
          <button className="button-link" disabled={busy} onClick={onCancel} type="button">{cancelLabel}</button>
          <button
            className={confirmTone === "primary" ? "modal-primary-button" : "button-link destructive-action"}
            disabled={busy}
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
