"use client";

import { useRef, useState } from "react";
import { DesignLedgerRowAction } from "@/components/design-ledger-screen";
import { ModalBoundary } from "@/components/modal-boundary";
import styles from "@/components/design-lab-connected.module.css";

export type LedgerSecondaryAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

/** Keep the Lab's minimal open action in the grid and governed specialist commands nearby. */
export function DesignLedgerRowActions({ label, onOpen, openDisabled = false, openHint, secondary = [] }: {
  label: string;
  onOpen: () => void;
  openDisabled?: boolean;
  openHint?: string;
  secondary?: LedgerSecondaryAction[];
}) {
  const [expanded, setExpanded] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return <div className="table-action-row" onClick={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}>
    {openDisabled ? <button aria-label={`Open ${label}`} className={styles.tableAction} disabled title={openHint} type="button"><span aria-hidden="true" className="material-symbols-outlined">open_in_new</span></button>
      : <DesignLedgerRowAction label={`Open ${label}`} onClick={onOpen} />}
    {secondary.length ? <button aria-label={`More actions for ${label}`} aria-expanded={expanded} className={styles.tableAction} onClick={() => setExpanded(true)} ref={triggerRef} type="button"><span aria-hidden="true" className="material-symbols-outlined">more_horiz</span></button> : null}
    {expanded ? <ModalBoundary onDismiss={() => setExpanded(false)} returnFocusRef={triggerRef}>
      <div className="modal-backdrop" onClick={() => setExpanded(false)}>
        <section aria-label={`Actions for ${label}`} aria-modal="true" className={styles.editModal} onClick={event => event.stopPropagation()} role="dialog">
          <div className={styles.modalHead}><h2>Actions</h2><button aria-label="Close row actions" className="icon-button icon-button-destructive" onClick={() => setExpanded(false)} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button></div>
          <p>{label}</p><div className={styles.entryFields}>{secondary.map(action => <button className={action.destructive ? styles.dangerButton : styles.secondaryButton} disabled={action.disabled} key={action.label} onClick={() => { setExpanded(false); action.onClick(); }} type="button">{action.destructive ? <span aria-hidden="true" className="material-symbols-outlined">delete</span> : null}{action.label}</button>)}</div>
        </section>
      </div>
    </ModalBoundary> : null}
  </div>;
}
