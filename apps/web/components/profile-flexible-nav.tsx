"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { computeFlexibleNavGeometry } from "@/lib/flexible-nav-geometry";
import { dispatchTrackerRouteReselect } from "@/lib/ledger-ui";
import { primaryProfileModules } from "@/lib/tracker-modules";

type ProfileFlexibleNavProps = {
  profileId: string;
};

type DockedNavState = {
  ready: boolean;
  progress: number;
  top: number;
  left: number;
  width: number;
};

const initialDockedNavState: DockedNavState = {
  ready: false,
  progress: 0,
  top: 0,
  left: 0,
  width: 0,
};

function hasMeaningfulDifference(current: DockedNavState, next: DockedNavState) {
  return (
    current.ready !== next.ready ||
    Math.abs(current.progress - next.progress) > 0.01 ||
    Math.abs(current.top - next.top) > 0.5 ||
    Math.abs(current.left - next.left) > 0.5 ||
    Math.abs(current.width - next.width) > 0.5
  );
}

export function ProfileFlexibleNav({ profileId }: ProfileFlexibleNavProps) {
  const pathname = usePathname();
  const placeholderRef = useRef<HTMLElement | null>(null);
  const [dockState, setDockState] = useState<DockedNavState>(initialDockedNavState);

  useEffect(() => {
    const placeholder = placeholderRef.current;
    const topBar = document.querySelector<HTMLElement>('[data-pd-id="app-shell.top-bar"]');

    if (!placeholder || !topBar) {
      return;
    }

    let rafId = 0;

    const measure = () => {
      const placeholderRect = placeholder.getBoundingClientRect();
      const topBarRect = topBar.getBoundingClientRect();
      const geometry = computeFlexibleNavGeometry({
        topBarBottom: topBarRect.bottom,
        staticTop: placeholderRect.top,
        staticLeft: placeholderRect.left,
        staticWidth: placeholderRect.width,
        viewportWidth: window.innerWidth,
      });

      const nextState: DockedNavState = {
        ready: true,
        progress: geometry.progress,
        top: geometry.top,
        left: geometry.left,
        width: geometry.width,
      };

      setDockState((current) =>
        hasMeaningfulDifference(current, nextState) ? nextState : current
      );
    };

    const scheduleMeasure = () => {
      cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(measure);
    };

    const resizeObserver = new ResizeObserver(() => {
      scheduleMeasure();
    });

    resizeObserver.observe(placeholder);
    resizeObserver.observe(topBar);
    scheduleMeasure();

    window.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, []);

  const navItems = useMemo(
    () =>
      primaryProfileModules.map((module) => {
        const href = `/profiles/${profileId}/tracker/${module.href}`;
        const isActive =
          pathname === href ||
          (module.href === "dashboard" && pathname === `/profiles/${profileId}/tracker`);

        return {
          href,
          isActive,
          title: module.title,
        };
      }),
    [pathname, profileId]
  );

  const overlayStyle = dockState.ready
    ? ({
        top: `${dockState.top}px`,
        left: `${dockState.left}px`,
        width: `${dockState.width}px`,
        opacity: 1,
        visibility: "visible",
        ["--dock-progress" as string]: dockState.progress.toString(),
      } as CSSProperties)
    : ({
        opacity: 0,
        visibility: "hidden",
      } as CSSProperties);

  const placeholderAriaHidden = dockState.ready ? true : undefined;
  const placeholderTabIndex = dockState.ready ? -1 : undefined;
  const overlayTabIndex = dockState.ready ? undefined : -1;
  const overlayIsFloating = dockState.ready && dockState.progress > 0.02;
  function handleNavClick(
    isActive: boolean,
    href: string,
    event: ReactMouseEvent<HTMLAnchorElement>
  ) {
    if (!isActive) {
      return;
    }

    event.preventDefault();
    dispatchTrackerRouteReselect(href);
  }
  const overlayMarkup = (
    <div
      aria-hidden={!dockState.ready}
      className="flexible-nav-overlay-shell"
      data-openforge-flex-nav="overlay"
      data-pd-id="tracker-nav.floating-overlay"
      style={overlayStyle}
    >
      <nav
        aria-label="Tracker sections"
        className={`flexible-nav flexible-nav-overlay ${overlayIsFloating ? "is-floating" : ""}`}
      >
        {navItems.map((item) => (
          <Link
            aria-current={item.isActive ? "page" : undefined}
            className={`flexible-nav-pill ${item.isActive ? "is-active" : ""}`}
            href={item.href}
            key={`overlay-${item.href}`}
            onClick={(event) => handleNavClick(item.isActive, item.href, event)}
            tabIndex={overlayTabIndex}
          >
            <span className="flexible-nav-label">{item.title}</span>
          </Link>
        ))}
      </nav>
    </div>
  );

  return (
    <div className={`flex-nav-shell ${dockState.ready ? "is-enhanced" : ""}`}>
      <nav
        aria-hidden={placeholderAriaHidden}
        aria-label="Tracker sections"
        className="flexible-nav flexible-nav-placeholder"
        data-openforge-flex-nav="placeholder"
        data-pd-id="tracker-nav.docked-placeholder"
        ref={placeholderRef}
      >
        {navItems.map((item) => (
          <Link
            aria-current={item.isActive ? "page" : undefined}
            className={`flexible-nav-pill ${item.isActive ? "is-active" : ""}`}
            href={item.href}
            key={`placeholder-${item.href}`}
            onClick={(event) => handleNavClick(item.isActive, item.href, event)}
            tabIndex={placeholderTabIndex}
          >
            <span className="flexible-nav-label">{item.title}</span>
          </Link>
        ))}
      </nav>
      {dockState.ready && typeof document !== "undefined"
        ? createPortal(overlayMarkup, document.body)
        : null}
    </div>
  );
}
