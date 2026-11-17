/** Shared pointer panning for Lab and real ledgers. Financial editing remains owned by each grid. */
export function installLedgerGridPan(element: HTMLElement, options: { blocked?: () => boolean } = {}) {
  type Drag = { id: number; x: number; left: number; active: boolean; button: number };
  let drag: Drag | null = null;
  let suppressClick = false;
  let releaseTimer: ReturnType<typeof setTimeout> | null = null;
  const interactive = 'a,button,input,select,textarea,[contenteditable="true"],[draggable="true"],[role="button"],[role="combobox"],[role="separator"],.column-resize-handle,.table-column-resize-handle';
  const down = (event: PointerEvent) => {
    if (event.pointerType === "touch" || (event.button !== 0 && event.button !== 1) || options.blocked?.()) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target || target.closest(interactive) || target.closest("th") || element.scrollWidth <= element.clientWidth) return;
    if (!target.closest("td") && target !== element) return;
    if (releaseTimer) clearTimeout(releaseTimer);
    suppressClick = false;
    drag = { id: event.pointerId, x: event.clientX, left: element.scrollLeft, active: false, button: event.button };
    if (event.button === 1) event.preventDefault();
  };
  const move = (event: PointerEvent) => {
    if (!drag || drag.id !== event.pointerId) return;
    const delta = event.clientX - drag.x;
    if (!drag.active && Math.abs(delta) < 6) return;
    if (!drag.active) {
      drag.active = true;
      element.setPointerCapture(event.pointerId);
      element.classList.add("is-panning");
      window.getSelection()?.removeAllRanges();
    }
    event.preventDefault();
    element.scrollLeft = drag.left - delta;
  };
  const finish = () => {
    if (!drag) return;
    suppressClick = drag.active || drag.button === 1;
    const id = drag.id;
    drag = null;
    element.classList.remove("is-panning");
    if (element.hasPointerCapture(id)) element.releasePointerCapture(id);
    releaseTimer = setTimeout(() => { suppressClick = false; releaseTimer = null; }, 0);
  };
  const click = (event: MouseEvent) => {
    if (event.type === "auxclick" && event.button === 1) event.preventDefault();
    if (!suppressClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressClick = false;
  };
  const select = (event: Event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("td") && !target.closest(interactive) && element.contains(target)) event.preventDefault();
  };
  element.addEventListener("pointerdown", down);
  element.addEventListener("pointermove", move);
  element.addEventListener("click", click, true);
  element.addEventListener("auxclick", click, true);
  element.addEventListener("selectstart", select);
  window.addEventListener("pointerup", finish);
  window.addEventListener("pointercancel", finish);
  window.addEventListener("blur", finish);
  return {
    isPending: () => drag !== null,
    dispose: () => {
      finish();
      if (releaseTimer) clearTimeout(releaseTimer);
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("click", click, true);
      element.removeEventListener("auxclick", click, true);
      element.removeEventListener("selectstart", select);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      window.removeEventListener("blur", finish);
    },
  };
}
