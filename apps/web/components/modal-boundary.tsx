"use client";

import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

/**
 * Preserve the signed-off backdrop/panel while owning browser top-layer modality.
 * Like ConfirmationDialog, Escape requests the existing controlled close path;
 * it never discards a dirty form or closes a pending write on its own.
 */
export function ModalBoundary({ children, onDismiss, returnFocusRef }: {
  children: ReactNode;
  onDismiss: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      const target = returnFocusRef?.current ?? trigger;
      if (target?.isConnected) target.focus({ preventScroll: true });
    };
  }, [returnFocusRef]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <dialog className="modal-boundary" ref={ref} role="presentation"
      onCancel={(event) => { event.preventDefault(); onDismiss(); }}>
      {children}
    </dialog>, document.body,
  );
}
