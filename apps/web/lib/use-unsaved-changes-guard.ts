"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const defaultMessage =
  "Unsaved changes will be discarded.";

type UnsavedGuard = {
  message: string;
  title?: string;
  accessibleName?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  onDiscard?: () => void;
  onSaveAndClose?: () => Promise<boolean>;
};

const activeUnsavedGuards = new Map<symbol, UnsavedGuard>();
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
  onSaveAndClose?: () => Promise<boolean>;
  resolve: (confirmed: boolean) => void;
};

let promptHandler: ((request: UnsavedChangesPromptRequest) => void) | null = null;

function requestUnsavedChangesConfirmation(
  guard: UnsavedGuard,
  onConfirmed?: () => void,
): Promise<boolean> {
  return requestAppConfirmation({
    accessibleName: guard.accessibleName ?? guard.title ?? "Unsaved tracker changes",
    cancelLabel: guard.cancelLabel ?? "Keep editing",
    confirmLabel: guard.confirmLabel ?? "Discard changes",
    eyebrow: "",
    message: guard.message,
    title: guard.title ?? "You have unsaved changes.",
    variant: "discard",
    onConfirmed: () => {
      guard.onDiscard?.();
      onConfirmed?.();
    },
    onSaveAndClose: guard.onSaveAndClose,
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
  const guard = activeUnsavedGuards.values().next().value as UnsavedGuard | undefined;
  return guard ? requestUnsavedChangesConfirmation(guard) : true;
}

export function confirmUnsavedTrackerNavigation(
  navigationHref: string,
  onConfirmed?: () => void,
): void {
  const guard = activeUnsavedGuards.values().next().value as UnsavedGuard | undefined;
  if (!guard) {
    onConfirmed?.();
    window.location.assign(navigationHref);
    return;
  }
  void requestAppConfirmation({
    accessibleName: guard.accessibleName ?? guard.title ?? "Unsaved tracker changes",
    cancelLabel: guard.cancelLabel ?? "Keep editing",
    confirmLabel: guard.confirmLabel ?? "Discard changes",
    eyebrow: "",
    message: guard.message,
    navigationHref,
    onConfirmed: () => {
      guard.onDiscard?.();
      onConfirmed?.();
    },
    onSaveAndClose: guard.onSaveAndClose,
    title: guard.title ?? "You have unsaved changes.",
    variant: "discard",
  });
}

export function useUnsavedChangesPromptController() {
  const [request, setRequest] = useState<UnsavedChangesPromptRequest | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const saveAndRespond = useCallback(async () => {
    if (!request?.onSaveAndClose || isSaving) return false;
    setIsSaving(true);
    try {
      const saved = await request.onSaveAndClose();
      if (saved) {
        request.resolve(true);
        setRequest(null);
      }
      return saved;
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, request]);

  return { isSaving, request, respond, saveAndRespond };
}

export function useUnsavedChangesGuard(
  isDirty: boolean,
  options: string | UnsavedGuard = defaultMessage
): () => Promise<boolean> {
  const guardId = useRef(Symbol("unsaved-tracker-form"));
  const guard = typeof options === "string" ? { message: options } : options;
  const confirmDiscardChanges = useCallback(async () => {
    if (!isDirty) {
      return true;
    }
    return requestUnsavedChangesConfirmation(guard);
  }, [guard, isDirty]);

  useEffect(() => {
    const activeGuardId = guardId.current;
    if (!isDirty) {
      activeUnsavedGuards.delete(activeGuardId);
      return;
    }

    activeUnsavedGuards.set(activeGuardId, guard);

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (
        document.activeElement instanceof HTMLElement &&
        document.activeElement.dataset.pdConfirmedNavigation === "true"
      ) return;
      if (allowNextDocumentNavigation) return;
      event.preventDefault();
      event.returnValue = guard.message;
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

      void requestUnsavedChangesConfirmation(guard).then((confirmed) => {
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
  }, [guard, isDirty]);

  useEffect(() => {
    const activeGuardId = guardId.current;
    return () => {
      activeUnsavedGuards.delete(activeGuardId);
    };
  }, []);

  return confirmDiscardChanges;
}
