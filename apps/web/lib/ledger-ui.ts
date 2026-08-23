"use client";

import { useEffect, useState, type RefObject } from "react";
import { usePathname } from "next/navigation";

export const TRACKER_ROUTE_RESELECT_EVENT = "openforge:tracker-route-reselected";

let bodyScrollLockCount = 0;
let previousBodyOverflow: string | null = null;

export function dispatchTrackerRouteReselect(href: string) {
  window.dispatchEvent(
    new CustomEvent<{ href: string }>(TRACKER_ROUTE_RESELECT_EVENT, {
      detail: { href },
    })
  );
}

export function usePersistedBoolean(storageKey: string, defaultValue: boolean) {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") {
      return defaultValue;
    }

    const storedValue = window.localStorage.getItem(storageKey);
    if (storedValue === "true") {
      return true;
    }
    if (storedValue === "false") {
      return false;
    }
    return defaultValue;
  });

  useEffect(() => {
    window.localStorage.setItem(storageKey, value ? "true" : "false");
  }, [storageKey, value]);

  return [value, setValue] as const;
}

export function usePersistedState<T>(
  storageKey: string,
  defaultValue: T,
  preferDefaultValue = false
) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return defaultValue;
    }

    if (preferDefaultValue) {
      return defaultValue;
    }

    const storedValue = window.localStorage.getItem(storageKey);
    if (!storedValue) {
      return defaultValue;
    }

    try {
      return JSON.parse(storedValue) as T;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  }, [storageKey, value]);

  return [value, setValue] as const;
}

export type GuidedAccessMode = "on" | "minimal" | "off";

export const guidedAccessModeOptions: GuidedAccessMode[] = ["on", "minimal", "off"];
export const guidedAccessModeSettingOptions: GuidedAccessMode[] = ["on", "off"];

export function normalizeGuidedAccessMode(value: unknown): GuidedAccessMode {
  return guidedAccessModeOptions.includes(value as GuidedAccessMode)
    ? (value as GuidedAccessMode)
    : "on";
}

export function isGuidedAccessEnabled(mode: GuidedAccessMode) {
  return mode !== "off";
}

export function useProfileGuidedAccessMode(profileId: string) {
  const [mode, setMode] = usePersistedState<GuidedAccessMode>(
    `plum-duff:${profileId}:guided-access-mode`,
    "on"
  );

  return [normalizeGuidedAccessMode(mode), setMode] as const;
}

export function useTrackerRouteReselect(onReselect: () => void) {
  const pathname = usePathname();

  useEffect(() => {
    const handleReselect = (event: Event) => {
      const detail = (event as CustomEvent<{ href?: string }>).detail;
      if (detail?.href === pathname) {
        onReselect();
      }
    };

    window.addEventListener(TRACKER_ROUTE_RESELECT_EVENT, handleReselect);
    return () => {
      window.removeEventListener(TRACKER_ROUTE_RESELECT_EVENT, handleReselect);
    };
  }, [onReselect, pathname]);
}

export function useDialogFocusLifecycle(
  active: boolean,
  dialogRef: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!active) {
      return;
    }

    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const animationFrame = window.requestAnimationFrame(() => {
      const initialFocus = dialogRef.current?.querySelector<HTMLElement>("[data-initial-focus]");
      (initialFocus ?? dialogRef.current)?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
    };
  }, [active, dialogRef]);
}

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) {
      return;
    }

    if (bodyScrollLockCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    bodyScrollLockCount += 1;

    return () => {
      bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);
      if (bodyScrollLockCount === 0) {
        document.body.style.overflow = previousBodyOverflow ?? "";
        previousBodyOverflow = null;
      }
    };
  }, [active]);
}

export function scrollToElementTop(element: HTMLElement | null) {
  if (!element) {
    return;
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  });
}

export function scrollToElementTopAfterRender(getElement: () => HTMLElement | null) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      scrollToElementTop(getElement());
    });
  });
}

export function useToastDismiss(
  message: string,
  clearMessage: () => void,
  timeoutMs = 5000
) {
  useEffect(() => {
    if (!message || message.startsWith("Loading ")) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      clearMessage();
    }, timeoutMs);

    return () => window.clearTimeout(timeoutId);
  }, [clearMessage, message, timeoutMs]);
}
