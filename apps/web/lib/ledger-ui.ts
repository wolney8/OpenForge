"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { usePathname } from "next/navigation";

export const TRACKER_ROUTE_RESELECT_EVENT = "openforge:tracker-route-reselected";

let bodyScrollLockCount = 0;
let previousBodyOverflow: string | null = null;
const PERSISTED_STATE_EVENT = "plum-duff:persisted-state-change";
const persistedStateCache = new Map<string, { raw: string | null; value: unknown }>();

function notifyPersistedStateChange(storageKey: string) {
  window.dispatchEvent(
    new CustomEvent<{ storageKey: string }>(PERSISTED_STATE_EVENT, {
      detail: { storageKey },
    })
  );
}

function subscribeToPersistedState(storageKey: string, onStoreChange: () => void) {
  const handleLocalChange = (event: Event) => {
    if ((event as CustomEvent<{ storageKey?: string }>).detail?.storageKey === storageKey) {
      onStoreChange();
    }
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKey) onStoreChange();
  };
  window.addEventListener(PERSISTED_STATE_EVENT, handleLocalChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(PERSISTED_STATE_EVENT, handleLocalChange);
    window.removeEventListener("storage", handleStorage);
  };
}

export function dispatchTrackerRouteReselect(href: string) {
  window.dispatchEvent(
    new CustomEvent<{ href: string }>(TRACKER_ROUTE_RESELECT_EVENT, {
      detail: { href },
    })
  );
}

export function usePersistedBoolean(storageKey: string, defaultValue: boolean) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeToPersistedState(storageKey, onStoreChange),
    [storageKey]
  );
  const getSnapshot = useCallback(() => {
    const storedValue = window.localStorage.getItem(storageKey);
    if (storedValue === "true") return true;
    if (storedValue === "false") return false;
    return defaultValue;
  }, [defaultValue, storageKey]);
  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue]);
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setValue: Dispatch<SetStateAction<boolean>> = useCallback(
    (nextValue) => {
      const resolved = typeof nextValue === "function" ? nextValue(getSnapshot()) : nextValue;
      window.localStorage.setItem(storageKey, resolved ? "true" : "false");
      notifyPersistedStateChange(storageKey);
    },
    [getSnapshot, storageKey]
  );
  return [value, setValue] as const;
}

export function usePersistedState<T>(
  storageKey: string,
  defaultValue: T,
  preferDefaultValue = false
) {
  const [initialDefault] = useState(defaultValue);
  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeToPersistedState(storageKey, onStoreChange),
    [storageKey]
  );
  const getSnapshot = useCallback(() => {
    const raw = window.localStorage.getItem(storageKey);
    const cached = persistedStateCache.get(storageKey);
    if (cached?.raw === raw) return cached.value as T;
    if (preferDefaultValue && !cached) {
      persistedStateCache.set(storageKey, { raw, value: initialDefault });
      return initialDefault;
    }
    let parsed = initialDefault;
    if (raw) {
      try {
        parsed = JSON.parse(raw) as T;
      } catch {
        parsed = initialDefault;
      }
    }
    persistedStateCache.set(storageKey, { raw, value: parsed });
    return parsed;
  }, [initialDefault, preferDefaultValue, storageKey]);
  const getServerSnapshot = useCallback(() => initialDefault, [initialDefault]);
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (nextValue) => {
      const resolved = typeof nextValue === "function"
        ? (nextValue as (current: T) => T)(getSnapshot())
        : nextValue;
      const raw = JSON.stringify(resolved);
      persistedStateCache.set(storageKey, { raw, value: resolved });
      window.localStorage.setItem(storageKey, raw);
      notifyPersistedStateChange(storageKey);
    },
    [getSnapshot, storageKey]
  );
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
