"use client";

import { type ReactNode, useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type LedgerTableScrollProps = {
  children: ReactNode;
  className?: string;
  dataPdId: string;
  cellNavigation?: { label: string; onActivate: (rowId: string, column: string, anchor: HTMLElement) => void };
};

type ArrowAnchor = {
  left: number;
  right: number;
  top: number;
};

const CONTROL_SIZE_PX = 40;
const CONTROL_GUTTER_PX = 10;
const VIEWPORT_GUTTER_PX = 8;

/** Keeps wide operational tables reachable without relying on a tiny scrollbar. */
export function LedgerTableScroll({
  children,
  className = "",
  dataPdId,
  cellNavigation,
}: LedgerTableScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({
    hasOverflow: false,
    left: false,
    right: false,
  });
  const [arrowAnchor, setArrowAnchor] = useState<ArrowAnchor | null>(null);
  const instructionsId = useId();
  const activateCell = useEffectEvent((cell: HTMLTableCellElement) => {
    cellNavigation?.onActivate(cell.dataset.ledgerRow!, cell.dataset.ledgerColumn!, cell);
  });
  const navigationLabel = cellNavigation?.label;

  useEffect(() => {
    const element = ref.current;
    if (!element || document.documentElement.dataset.uxShell !== "v2") return;
    element.tabIndex = 0;
    element.setAttribute("role", "region");
    element.setAttribute("aria-label", "Ledger Table — Use Left and Right Arrows to Scroll");
    if (navigationLabel) {
      element.setAttribute("aria-label", `${navigationLabel} spreadsheet`);
      element.setAttribute("aria-describedby", instructionsId);
    }
    let selectedCell: HTMLTableCellElement | null = null;
    const cells = () => [...element.querySelectorAll<HTMLTableCellElement>("td[data-ledger-row][data-ledger-column]")];
    const initialiseCells = () => {
      const available = cells();
      if (selectedCell && !available.includes(selectedCell)) selectedCell = null;
      available.forEach((cell, index) => { cell.tabIndex = selectedCell ? cell === selectedCell ? 0 : -1 : index === 0 ? 0 : -1; });
    };
    const selectCell = (cell: HTMLTableCellElement, focus = true) => {
      selectedCell?.removeAttribute("data-ledger-selected");
      selectedCell = cell;
      cell.dataset.ledgerSelected = "true";
      initialiseCells();
      if (focus) cell.focus({ preventScroll: true });
    };
    const cellFor = (target: EventTarget | null) => {
      if (!navigationLabel || !(target instanceof Element) || target.closest('a,button,input,select,textarea,[contenteditable="true"],[role="button"],[role="combobox"]')) return null;
      const cell = target.closest<HTMLTableCellElement>("td[data-ledger-row][data-ledger-column]");
      return cell && element.contains(cell) ? cell : null;
    };
    const clearSelection = (event: Event) => {
      if (event.target instanceof Node && !element.contains(event.target) && !document.querySelector('dialog[open], [role="dialog"][aria-modal="true"], [data-pd-id="ledger.floating-editor"]')) {
        selectedCell?.removeAttribute("data-ledger-selected");
      }
    };
    const focused = (event: FocusEvent) => {
      const cell = cellFor(event.target);
      if (cell && event.target === cell) selectCell(cell, false);
    };
    const activate = (event: MouseEvent) => {
      const cell = cellFor(event.target);
      if (!cell || suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      selectCell(cell);
      activateCell(cell);
    };
    let drag: { id: number; start: number; scroll: number; active: boolean } | null = null;
    let suppressClick = false;
    const interactive = 'a,button,input,select,textarea,[contenteditable="true"],[draggable="true"],[role="separator"],.column-resize-handle,.table-column-resize-handle';
    const down = (event: PointerEvent) => {
      if (event.pointerType === "touch" || (event.button !== 0 && event.button !== 1)) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target || target.closest(interactive) || target.closest("th")) return;
      // Left-button text selection remains native on nested cell content.
      // Middle-button panning works on ordinary cell text as well as background.
      if (event.button === 0 && target !== element && target.tagName !== "TD") return;
      if (event.button === 0 && target.tagName === "TD") {
        const hitsText = [...target.childNodes].some(node => {
          if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) return false;
          const range = document.createRange();
          range.selectNodeContents(node);
          return [...range.getClientRects()].some(rect => event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom);
        });
        if (hitsText) return;
      }
      if (element.scrollWidth <= element.clientWidth) return;
      suppressClick = false;
      drag = { id: event.pointerId, start: event.clientX, scroll: element.scrollLeft, active: false };
      if (event.button === 1) event.preventDefault();
    };
    const move = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const distance = event.clientX - drag.start;
      if (!drag.active && Math.abs(distance) < 6) return;
      if (!drag.active) {
        drag.active = true;
        element.setPointerCapture(event.pointerId);
        element.classList.add("is-panning");
      }
      event.preventDefault();
      element.scrollLeft = drag.scroll - distance;
    };
    const finish = () => {
      if (!drag) return;
      suppressClick = drag.active;
      const id = drag.id;
      drag = null;
      element.classList.remove("is-panning");
      if (element.hasPointerCapture(id)) element.releasePointerCapture(id);
    };
    const click = (event: MouseEvent) => {
      if (event.type === "auxclick" && event.button === 1) event.preventDefault();
      if (suppressClick) {
        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
        return;
      }
      if (event.type !== "click" || event.button !== 0) return;
      const cell = cellFor(event.target);
      if (!cell) return;
      event.stopPropagation();
      // Keep an actual native text selection intact; selecting a cell never saves it.
      if (!window.getSelection()?.isCollapsed) return;
      selectCell(cell);
    };
    const keyboard = (event: KeyboardEvent) => {
      const cell = cellFor(event.target);
      if (cell && event.target === cell && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        if (["Enter", "F2"].includes(event.key)) {
          event.preventDefault(); event.stopPropagation(); activateCell(cell); return;
        }
        if (event.key === "Escape") {
          cell.removeAttribute("data-ledger-selected"); event.stopPropagation(); return;
        }
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
          event.preventDefault(); event.stopPropagation();
          const row = cell.parentElement;
          const rowCells = row ? [...row.querySelectorAll<HTMLTableCellElement>("td[data-ledger-column]")] : [];
          const index = rowCells.indexOf(cell);
          const target = event.key === "Home" ? rowCells[0]
            : event.key === "End" ? rowCells.at(-1)
            : event.key === "ArrowLeft" ? rowCells[index - 1]
            : event.key === "ArrowRight" ? rowCells[index + 1]
            : [...(event.key === "ArrowUp" ? row?.previousElementSibling : row?.nextElementSibling)?.querySelectorAll<HTMLTableCellElement>("td[data-ledger-column]") ?? []].find(item => item.dataset.ledgerColumn === cell.dataset.ledgerColumn);
          if (target) {
            selectCell(target);
            target.scrollIntoView({ block: "nearest", inline: "nearest" });
            // Native scrolling does not account for the sticky Actions column.
            const actions = target.parentElement?.lastElementChild;
            const actionBounds = actions?.getBoundingClientRect();
            const bounds = target.getBoundingClientRect();
            if (actions && getComputedStyle(actions).position === "sticky" && actionBounds) {
              const viewport = element.getBoundingClientRect();
              const available = actionBounds.left - viewport.left;
              if (bounds.width > available) {
                // Preserve existing column widths at narrow viewports: maximise
                // the visible cell fragment instead of hiding it under Actions.
                element.scrollLeft += bounds.left + bounds.width / 2 - (viewport.left + available / 2);
              } else if (bounds.right > actionBounds.left) {
                element.scrollLeft += bounds.right - actionBounds.left;
              }
            }
          }
          return;
        }
      }
      if (event.target !== element || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      element.scrollBy({ left: event.key === "ArrowRight" ? 120 : -120, behavior: "auto" });
    };
    element.addEventListener("pointerdown", down);
    element.addEventListener("pointermove", move);
    element.addEventListener("click", click, true);
    element.addEventListener("auxclick", click, true);
    element.addEventListener("keydown", keyboard);
    element.addEventListener("dblclick", activate, true);
    element.addEventListener("focusin", focused);
    document.addEventListener("pointerdown", clearSelection, true);
    const cellObserver = new MutationObserver(initialiseCells);
    if (navigationLabel) { initialiseCells(); cellObserver.observe(element, { childList: true, subtree: true }); }
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    window.addEventListener("blur", finish);
    return () => {
      finish();
      element.removeAttribute("tabindex");
      element.removeAttribute("role");
      element.removeAttribute("aria-label");
      element.removeAttribute("aria-describedby");
      cells().forEach(cell => { cell.removeAttribute("tabindex"); cell.removeAttribute("data-ledger-selected"); });
      cellObserver.disconnect();
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("click", click, true);
      element.removeEventListener("auxclick", click, true);
      element.removeEventListener("keydown", keyboard);
      element.removeEventListener("dblclick", activate, true);
      element.removeEventListener("focusin", focused);
      document.removeEventListener("pointerdown", clearSelection, true);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      window.removeEventListener("blur", finish);
    };
  }, [instructionsId, navigationLabel]);

  useEffect(() => {
    const element = ref.current;
    const wrapper = wrapperRef.current;
    if (!element || !wrapper) return;

    const update = () => {
      const maximum = Math.max(0, element.scrollWidth - element.clientWidth);
      const hasOverflow = maximum > 2;
      setScrollState({
        hasOverflow,
        left: element.scrollLeft > 2,
        right: maximum - element.scrollLeft > 2,
      });

      const bounds = wrapper.getBoundingClientRect();
      const visibleTop = Math.max(VIEWPORT_GUTTER_PX, bounds.top + VIEWPORT_GUTTER_PX);
      const visibleBottom = Math.min(
        window.innerHeight - VIEWPORT_GUTTER_PX,
        bounds.bottom - VIEWPORT_GUTTER_PX,
      );
      const visibleHeight = visibleBottom - visibleTop;
      if (!hasOverflow || visibleHeight < CONTROL_SIZE_PX) {
        setArrowAnchor(null);
        return;
      }

      const minimumLeft = VIEWPORT_GUTTER_PX;
      const maximumLeft = window.innerWidth - CONTROL_SIZE_PX - VIEWPORT_GUTTER_PX;
      setArrowAnchor({
        left: Math.max(
          minimumLeft,
          Math.min(maximumLeft, bounds.left + CONTROL_GUTTER_PX),
        ),
        right: Math.max(
          minimumLeft,
          Math.min(
            maximumLeft,
            bounds.right - CONTROL_GUTTER_PX - CONTROL_SIZE_PX,
          ),
        ),
        top: visibleTop + visibleHeight / 2,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    observer.observe(wrapper);
    element.addEventListener("scroll", update, { passive: true });
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", update);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scroll = (direction: -1 | 1) => {
    const element = ref.current;
    if (!element) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollBy({
      left: element.clientWidth * direction * 0.72,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  const controls =
    typeof document !== "undefined" && arrowAnchor && scrollState.hasOverflow
      ? createPortal(
          <div
            aria-label="Table horizontal navigation"
            className="ledger-table-scroll-controls"
            data-pd-id={`${dataPdId}.scroll-controls`}
          >
            <button
              aria-label="Scroll table left"
              className="ledger-table-scroll-arrow ledger-table-scroll-arrow-left"
              data-pd-id={`${dataPdId}.scroll-left`}
              disabled={!scrollState.left}
              onClick={() => scroll(-1)}
              style={{ left: arrowAnchor.left, top: arrowAnchor.top }}
              type="button"
            >
              <span aria-hidden="true" className="material-symbols-outlined">chevron_left</span>
            </button>
            <button
              aria-label="Scroll table right"
              className="ledger-table-scroll-arrow ledger-table-scroll-arrow-right"
              data-pd-id={`${dataPdId}.scroll-right`}
              disabled={!scrollState.right}
              onClick={() => scroll(1)}
              style={{ left: arrowAnchor.right, top: arrowAnchor.top }}
              type="button"
            >
              <span aria-hidden="true" className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={`ledger-table-scroll-wrap ${className}`.trim()} ref={wrapperRef}>
      {cellNavigation ? <span className="sr-only" id={instructionsId}>Use arrow keys, Home or End to select a cell. Press Enter or F2, or double-click, to open the existing {cellNavigation.label} editor. Escape clears cell selection.</span> : null}
      <div className="table-scroll" data-pd-id={dataPdId} ref={ref}>
        {children}
      </div>
      {controls}
    </div>
  );
}
