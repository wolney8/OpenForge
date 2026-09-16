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
    const requestedReturnTarget = returnFocusRef?.current;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      const target = requestedReturnTarget ?? trigger;
      if (target?.isConnected) target.focus({ preventScroll: true });
    };
  }, [returnFocusRef]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <dialog className="modal-boundary" ref={ref} role="presentation"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const dialog = event.currentTarget;
        // A nested native confirmation owns its own cycle, not the parent boundary.
        if (document.activeElement?.closest("dialog") !== dialog) return;
        const controls = [...dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
        )].filter(element => element.getClientRects().length > 0 && !element.closest("[inert]"));
        const first = controls[0], last = controls.at(-1);
        if (!first || !last) { event.preventDefault(); dialog.focus(); return; }
        const activeElement = document.activeElement;
        const activeIsDialogContainer =
          activeElement instanceof HTMLElement &&
          activeElement !== dialog &&
          activeElement.getAttribute("role") === "dialog" &&
          dialog.contains(activeElement);
        if (event.shiftKey && (activeElement === first || activeElement === dialog || activeIsDialogContainer)) {
          event.preventDefault(); last.focus({ preventScroll: true });
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
          event.preventDefault(); first.focus({ preventScroll: true });
        }
      }}
      onCancel={(event) => { event.preventDefault(); onDismiss(); }}>
      {children}
    </dialog>, document.body,
  );
}
