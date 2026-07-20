"use client";

import { useCallback, useEffect, useRef } from "react";

const defaultMessage =
  "You have unsaved changes in this tracker form. Leave this page and discard them?";

const activeUnsavedGuards = new Map<symbol, string>();

export function confirmUnsavedTrackerChanges(): boolean {
  const message = activeUnsavedGuards.values().next().value as string | undefined;
  return message ? window.confirm(message) : true;
}

export function useUnsavedChangesGuard(
  isDirty: boolean,
  message: string = defaultMessage
): () => boolean {
  const guardId = useRef(Symbol("unsaved-tracker-form"));
  const confirmDiscardChanges = useCallback(() => {
    if (!isDirty) {
      return true;
    }
    return window.confirm(message);
  }, [isDirty, message]);

  useEffect(() => {
    const activeGuardId = guardId.current;
    if (!isDirty) {
      activeUnsavedGuards.delete(activeGuardId);
      return;
    }

    activeUnsavedGuards.set(activeGuardId, message);

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }
      if (anchor.target && anchor.target !== "_self") {
        return;
      }
      if (anchor.hasAttribute("download")) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);
      if (destination.href === current.href) {
        return;
      }

      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      activeUnsavedGuards.delete(activeGuardId);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [isDirty, message]);

  return confirmDiscardChanges;
}
