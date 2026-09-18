"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const defaultMessage =
  "Unsaved changes will be discarded.";

const activeUnsavedGuards = new Map<symbol, string>();
export const APP_CONFIRMATION_OPEN_EVENT = "plum-duff:app-confirmation-open";
export const APP_CONFIRMED_NAVIGATION_EVENT = "plum-duff:confirmed-navigation";

let allowNextDocumentNavigation = false;

type UnsavedChangesPromptRequest = {
  accessibleName: string;
  cancelLabel: string;
  confirmLabel: string;
  eyebrow: string;
  message: string;
  navigationHref?: string;
  title: string;
  variant: "discard" | "destructive";
  onConfirmed?: () => void;
  resolve: (confirmed: boolean) => void;
};

let promptHandler: ((request: UnsavedChangesPromptRequest) => void) | null = null;

function requestUnsavedChangesConfirmation(message: string, onConfirmed?: () => void): Promise<boolean> {
  return requestAppConfirmation({
    accessibleName: "Unsaved tracker changes",
    cancelLabel: "Keep Editing",
    confirmLabel: "Discard Changes",
    eyebrow: "",
    message,
    title: "Leave this tracker form?",
    variant: "discard",
    onConfirmed,
  });
}

export function requestAppConfirmation(
  request: Omit<UnsavedChangesPromptRequest, "resolve">
): Promise<boolean> {
  window.dispatchEvent(new Event(APP_CONFIRMATION_OPEN_EVENT));
  if (!promptHandler) {
    // Browser unload cannot be replaced by app UI; this fallback is only for
    // calls made before the app-level prompt controller has mounted.
    return Promise.resolve(window.confirm(request.message));
  }

  return new Promise((resolve) => {
    promptHandler?.({ ...request, resolve });
  });
}

export function confirmDestructiveAction({
  confirmLabel = "Delete",
  message,
  title,
}: {
  confirmLabel?: string;
  message: string;
  title: string;
}): Promise<boolean> {
  return requestAppConfirmation({
    accessibleName: title,
    cancelLabel: "Cancel",
    confirmLabel,
    eyebrow: "Confirm Delete",
    message,
    title,
    variant: "destructive",
  });
}

export function hasUnsavedTrackerChanges(): boolean {
  return activeUnsavedGuards.size > 0;
}

export async function confirmUnsavedTrackerChanges(): Promise<boolean> {
  const message = activeUnsavedGuards.values().next().value as string | undefined;
  return message ? requestUnsavedChangesConfirmation(message) : true;
}

export function confirmUnsavedTrackerNavigation(
  navigationHref: string,
  onConfirmed?: () => void,
): void {
  const message = activeUnsavedGuards.values().next().value as string | undefined;
  if (!message) {
    onConfirmed?.();
    window.location.assign(navigationHref);
    return;
  }
  void requestAppConfirmation({
    accessibleName: "Unsaved tracker changes",
    cancelLabel: "Keep Editing",
    confirmLabel: "Discard Changes",
    eyebrow: "",
    message,
    navigationHref,
    onConfirmed,
    title: "Leave this tracker form?",
    variant: "discard",
  });
}

export function useUnsavedChangesPromptController() {
  const [request, setRequest] = useState<UnsavedChangesPromptRequest | null>(null);

  useEffect(() => {
    const handler = (nextRequest: UnsavedChangesPromptRequest) => {
      setRequest(nextRequest);
    };

    promptHandler = handler;
    return () => {
      if (promptHandler === handler) {
        promptHandler = null;
      }
    };
  }, []);

  const respond = useCallback(
    (confirmed: boolean) => {
      if (confirmed && !request?.navigationHref) request?.onConfirmed?.();
      request?.resolve(confirmed);
      setRequest(null);
    },
    [request]
  );

  return { request, respond };
}

export function useUnsavedChangesGuard(
  isDirty: boolean,
  message: string = defaultMessage
): () => Promise<boolean> {
  const guardId = useRef(Symbol("unsaved-tracker-form"));
  const confirmDiscardChanges = useCallback(async () => {
    if (!isDirty) {
      return true;
    }
    return requestUnsavedChangesConfirmation(message);
  }, [isDirty, message]);

  useEffect(() => {
    const activeGuardId = guardId.current;
    if (!isDirty) {
      activeUnsavedGuards.delete(activeGuardId);
      return;
    }

    activeUnsavedGuards.set(activeGuardId, message);

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (
        document.activeElement instanceof HTMLElement &&
        document.activeElement.dataset.pdConfirmedNavigation === "true"
      ) return;
      if (allowNextDocumentNavigation) return;
      event.preventDefault();
      event.returnValue = message;
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (allowNextDocumentNavigation) {
        allowNextDocumentNavigation = false;
        return;
      }
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
      if (anchor.dataset.pdManagedNavigation === "true") {
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

      event.preventDefault();
      event.stopPropagation();

      void requestUnsavedChangesConfirmation(message).then((confirmed) => {
        if (confirmed) {
          allowNextDocumentNavigation = true;
          // The drawer closes when the app confirmation opens, so its Link may
          // already be detached by the time the user confirms. Navigate using
          // the captured destination after retiring this confirmed guard.
          activeUnsavedGuards.delete(activeGuardId);
          window.removeEventListener("beforeunload", handleBeforeUnload);
          document.removeEventListener("click", handleDocumentClick, true);
          const navigationDetail = { handled: false, href: destination.href };
          window.dispatchEvent(new CustomEvent(APP_CONFIRMED_NAVIGATION_EVENT, {
            detail: navigationDetail,
          }));
          if (!navigationDetail.handled) window.location.assign(destination.href);
        }
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      activeUnsavedGuards.delete(activeGuardId);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [isDirty, message]);

  useEffect(() => {
    const activeGuardId = guardId.current;
    return () => {
      activeUnsavedGuards.delete(activeGuardId);
    };
  }, []);

  return confirmDiscardChanges;
}
