"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DesignLedgerRowAction } from "@/components/design-ledger-screen";
import styles from "@/components/design-lab-connected.module.css";

export type LedgerSecondaryAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

/** A row-owned menu rendered above the table's clipped scroll viewport. */
export function LedgerRowActionMenu({ label, secondary }: { label: string; secondary: LedgerSecondaryAction[] }) {
  const [expanded, setExpanded] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 216 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useLayoutEffect(() => {
    if (!expanded) return;
    const update = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(248, window.innerWidth - 24);
      const height = Math.min(menuRef.current?.scrollHeight ?? 240, window.innerHeight - 24);
      setPosition({
        left: Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12)),
        top: rect.bottom + height + 8 <= window.innerHeight ? rect.bottom + 4 : Math.max(12, rect.top - height - 4),
        width,
      });
    };
    update();
    menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true });
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || menuRef.current?.contains(event.target) || triggerRef.current?.contains(event.target)) return;
      setExpanded(false);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setExpanded(false); triggerRef.current?.focus(); return; }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) || !menuRef.current?.contains(document.activeElement)) return;
      const items = [...menuRef.current.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      if (!items.length) return;
      event.preventDefault();
      const index = items.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", keyboard, true);
    return () => { document.removeEventListener("pointerdown", outside, true); document.removeEventListener("keydown", keyboard, true); };
  }, [expanded]);

  if (!secondary.length) return null;
  return <>
    <button aria-controls={id} aria-expanded={expanded} aria-haspopup="menu" aria-label={`More actions for ${label}`} className={styles.tableAction} onClick={() => setExpanded(value => !value)} ref={triggerRef} type="button"><span aria-hidden="true" className="material-symbols-outlined">more_vert</span></button>
    {expanded && typeof document !== "undefined" ? createPortal(<div aria-label={`Actions for ${label}`} className={styles.rowActionMenu} data-pd-id="ledger.row-actions.menu" id={id} ref={menuRef} role="menu" style={{ top: position.top, left: position.left, width: position.width }}>
      {secondary.map(action => <button className={`${styles.rowActionMenuItem}${action.destructive ? ` ${styles.rowActionMenuDanger}` : ""}`} disabled={action.disabled} key={action.label} onClick={() => { setExpanded(false); triggerRef.current?.focus(); action.onClick(); }} role="menuitem" type="button">{action.destructive ? <span aria-hidden="true" className="material-symbols-outlined">delete</span> : null}{action.label}</button>)}
    </div>, document.body) : null}
  </>;
}

export function DesignLedgerRowActions({ label, onOpen, openDisabled = false, openHint, secondary = [] }: {
  label: string;
  onOpen: () => void;
  openDisabled?: boolean;
  openHint?: string;
  secondary?: LedgerSecondaryAction[];
}) {
  return <div className={`table-action-row ${styles.rowActionGroup}`} onClick={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}>
    {openDisabled ? <button aria-label={`Open ${label}`} className={styles.tableAction} disabled title={openHint} type="button"><span aria-hidden="true" className="material-symbols-outlined">open_in_new</span></button>
      : <DesignLedgerRowAction label={`Open ${label}`} onClick={onOpen} />}
    <LedgerRowActionMenu label={label} secondary={secondary} />
  </div>;
}
