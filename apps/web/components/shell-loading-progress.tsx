"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  SHELL_LOADING_END_EVENT,
  SHELL_LOADING_START_EVENT,
  SHELL_ROUTE_TRANSITION_END_EVENT,
  SHELL_ROUTE_TRANSITION_START_EVENT,
} from "@/lib/shell-loading";

type LockedElement = {
  ariaBusy: string | null;
  element: HTMLElement;
  inert: boolean;
};

const navigationFailureReleaseMs = 15_000;

export function ShellLoadingProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isRouteTransitioning, setIsRouteTransitioning] = useState(false);
  const routeTransitioningRef = useRef(false);
  const lockedElementsRef = useRef<LockedElement[]>([]);
  const releaseTimerRef = useRef<number | null>(null);

  const releaseRouteTransition = useCallback(() => {
    routeTransitioningRef.current = false;
    if (releaseTimerRef.current !== null) {
      window.clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
    }
    for (const { ariaBusy, element, inert } of lockedElementsRef.current) {
      if (!inert) element.removeAttribute("inert");
      if (ariaBusy === null) element.removeAttribute("aria-busy");
      else element.setAttribute("aria-busy", ariaBusy);
      element.removeAttribute("data-route-transition-locked");
    }
    lockedElementsRef.current = [];
    document.querySelectorAll<HTMLElement>("[data-route-transition-source]").forEach((element) => {
      element.removeAttribute("aria-disabled");
      element.removeAttribute("data-route-transition-source");
    });
    document.querySelector<HTMLElement>(".app-frame")?.classList.remove("is-route-transitioning");
    setIsRouteTransitioning(false);
  }, []);

  const startRouteTransition = useCallback((source?: HTMLElement | null) => {
    if (routeTransitioningRef.current) return false;
    routeTransitioningRef.current = true;
    source?.setAttribute("aria-disabled", "true");
    source?.setAttribute("data-route-transition-source", "");

    const elements = [
      document.querySelector<HTMLElement>(".main-shell"),
      ...Array.from(document.querySelectorAll<HTMLElement>(
        ".top-app-bar > :not([data-pd-id='app-shell.loading-progress']):not(.shell-route-transition-shield)"
      )),
    ].filter((element): element is HTMLElement => element !== null);
    lockedElementsRef.current = elements.map((element) => ({
      ariaBusy: element.getAttribute("aria-busy"),
      element,
      inert: element.hasAttribute("inert"),
    }));
    for (const element of elements) {
      element.setAttribute("inert", "");
      element.setAttribute("data-route-transition-locked", "");
    }
    elements[0]?.setAttribute("aria-busy", "true");
    document.querySelector<HTMLElement>(".app-frame")?.classList.add("is-route-transitioning");
    setIsRouteTransitioning(true);
    releaseTimerRef.current = window.setTimeout(
      releaseRouteTransition,
      navigationFailureReleaseMs
    );
    return true;
  }, [releaseRouteTransition]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(releaseRouteTransition);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, releaseRouteTransition, searchParams]);

  useEffect(() => {
    const start = () => setIsDataLoading(true);
    const stop = () => setIsDataLoading(false);
    const startProgrammaticRoute = () => startRouteTransition();
    const startForInternalNavigation = (event: MouseEvent) => {
      if (routeTransitioningRef.current) {
        const repeatedTarget = (event.target as Element | null)?.closest("a[href], button");
        if (repeatedTarget) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (`${destination.pathname}${destination.search}` === `${window.location.pathname}${window.location.search}`) return;
      startRouteTransition(anchor);
    };
    document.addEventListener("click", startForInternalNavigation, true);
    window.addEventListener(SHELL_LOADING_START_EVENT, start);
    window.addEventListener(SHELL_LOADING_END_EVENT, stop);
    window.addEventListener(SHELL_ROUTE_TRANSITION_START_EVENT, startProgrammaticRoute);
    window.addEventListener(SHELL_ROUTE_TRANSITION_END_EVENT, releaseRouteTransition);
    return () => {
      document.removeEventListener("click", startForInternalNavigation, true);
      window.removeEventListener(SHELL_LOADING_START_EVENT, start);
      window.removeEventListener(SHELL_LOADING_END_EVENT, stop);
      window.removeEventListener(SHELL_ROUTE_TRANSITION_START_EVENT, startProgrammaticRoute);
      window.removeEventListener(SHELL_ROUTE_TRANSITION_END_EVENT, releaseRouteTransition);
      releaseRouteTransition();
    };
  }, [releaseRouteTransition, startRouteTransition]);

  const isLoading = isDataLoading || isRouteTransitioning;

  return (
    <>
      <div
        aria-hidden={!isLoading}
        aria-label={isRouteTransitioning ? "Loading destination" : "Loading page data"}
        aria-valuemax={100}
        aria-valuemin={0}
        className={`shell-loading-progress${isLoading ? " is-active" : ""}`}
        data-pd-id="app-shell.loading-progress"
        role="progressbar"
      >
        <span />
      </div>
      {isRouteTransitioning ? (
        <div
          aria-hidden="true"
          className="shell-route-transition-shield"
          data-pd-id="app-shell.route-transition-lock"
        />
      ) : null}
    </>
  );
}
