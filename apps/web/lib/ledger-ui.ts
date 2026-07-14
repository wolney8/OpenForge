"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export const TRACKER_ROUTE_RESELECT_EVENT = "openforge:tracker-route-reselected";

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

export function usePersistedState<T>(storageKey: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") {
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
  timeoutMs = 2600
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
