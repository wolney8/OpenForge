"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import styles from "./design-lab-connected.module.css";

/** One lab-scoped trigger anchor for the header's menus and search results. */
export function DesignLabHeaderOverlay({ anchorRef, children, label, onClose, preferredWidth, returnFocusRef, search = false }: {
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  label: string;
  onClose: () => void;
  preferredWidth: number;
  returnFocusRef?: RefObject<HTMLElement | null>;
  search?: boolean;
}) {
  const surfaceRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  const [placement, setPlacement] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const surface = surfaceRef.current;
    if (!anchor || !surface) return;
    const viewport = window.visualViewport;
    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const leftEdge = viewport?.offsetLeft ?? 0;
      const topEdge = viewport?.offsetTop ?? 0;
      const viewportWidth = viewport?.width ?? window.innerWidth;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const margin = 12;
      const width = Math.min(search ? rect.width : preferredWidth, viewportWidth - margin * 2);
      const left = Math.max(leftEdge + margin, Math.min(search ? rect.left : rect.right - width, leftEdge + viewportWidth - width - margin));
      const below = topEdge + viewportHeight - rect.bottom - margin - 8;
      const above = rect.top - topEdge - margin - 8;
      const measured = Math.min(surface.scrollHeight, viewportHeight - margin * 2);
      const useAbove = below < Math.min(measured, 280) && above > below;
      const maxHeight = Math.max(100, Math.min(useAbove ? above : below, viewportHeight - margin * 2));
      const top = useAbove ? Math.max(topEdge + margin, rect.top - Math.min(measured, maxHeight) - 8) : rect.bottom + 8;
      setPlacement({ left, top, width, maxHeight });
    };
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Element;
      if (surface.contains(target) || anchor.contains(target)) return;
      closeRef.current();
      if (!target.closest("button, a, input, select, textarea, [tabindex]")) {
        requestAnimationFrame(() => (returnFocusRef?.current ?? anchor).focus({ preventScroll: true }));
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closeRef.current();
      (returnFocusRef?.current ?? anchor).focus({ preventScroll: true });
    };
    place();
    if (!search) surface.focus({ preventScroll: true });
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    viewport?.addEventListener("resize", place);
    viewport?.addEventListener("scroll", place);
    const observer = new ResizeObserver(place);
    observer.observe(anchor);
    observer.observe(surface);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      viewport?.removeEventListener("resize", place);
      viewport?.removeEventListener("scroll", place);
      observer.disconnect();
    };
  }, [anchorRef, preferredWidth, returnFocusRef, search]);

  return <section aria-label={label} className={`${styles.headerOverlay} ${search ? styles.searchOverlay : ""}`} data-pd-id={search ? "lab.search-results" : "lab.header-menu"} ref={surfaceRef} role="region" style={placement ? { left: placement.left, top: placement.top, width: placement.width, maxHeight: placement.maxHeight } : { visibility: "hidden" }} tabIndex={-1}>{children}</section>;
}
