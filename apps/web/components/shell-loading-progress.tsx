"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SHELL_LOADING_END_EVENT, SHELL_LOADING_START_EVENT } from "@/lib/shell-loading";

export function ShellLoadingProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsNavigating(false));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, searchParams]);

  useEffect(() => {
    const start = () => setIsNavigating(true);
    const stop = () => setIsNavigating(false);
    const startForInternalNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (`${destination.pathname}${destination.search}` === `${window.location.pathname}${window.location.search}`) return;
      setIsNavigating(true);
    };
    document.addEventListener("click", startForInternalNavigation, true);
    window.addEventListener(SHELL_LOADING_START_EVENT, start);
    window.addEventListener(SHELL_LOADING_END_EVENT, stop);
    return () => {
      document.removeEventListener("click", startForInternalNavigation, true);
      window.removeEventListener(SHELL_LOADING_START_EVENT, start);
      window.removeEventListener(SHELL_LOADING_END_EVENT, stop);
    };
  }, []);

  return (
    <div
      aria-hidden={!isNavigating}
      aria-label="Loading page"
      aria-valuemax={100}
      aria-valuemin={0}
      className={`shell-loading-progress${isNavigating ? " is-active" : ""}`}
      data-pd-id="app-shell.loading-progress"
      role="progressbar"
    >
      <span />
    </div>
  );
}
