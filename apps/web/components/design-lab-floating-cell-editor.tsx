"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import styles from "./design-lab-connected.module.css";

export function DesignLabFloatingCellEditor({ anchor, label, value, originalValue, onChange, onCommit, onCancel, error, choices, inputType = "text", multiline, children, onAdvance }: {
  anchor: HTMLElement | null;
  label: string;
  value: string;
  originalValue: string;
  onChange: (value: string) => void;
  onCommit: (value: string, reason: "keyboard" | "outside" | "choice" | "tab") => boolean;
  onCancel: (reason: "keyboard" | "outside") => void;
  error: string;
  choices?: string[];
  inputType?: "text" | "date" | "datetime-local";
  multiline?: boolean;
  children?: ReactNode;
  onAdvance?: (direction: -1 | 1) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const choiceList = useRef<HTMLDivElement>(null);
  const blockNextOutsideClick = useRef(false);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 180, maxHeight: 300 });
  const [activeChoice, setActiveChoice] = useState(() => Math.max(0, choices?.indexOf(originalValue) ?? 0));
  const [choiceQuery, setChoiceQuery] = useState("");
  const visibleChoices = choices?.filter(choice => choice.toLocaleLowerCase().includes(choiceQuery.toLocaleLowerCase())) ?? [];
  useLayoutEffect(() => {
    if (!anchor) return;
    const update = () => {
      const cell = anchor.getBoundingClientRect();
      const availableWidth = Math.max(160, window.innerWidth - 24);
      const width = Math.min(availableWidth, Math.max(cell.width, choices ? 220 : multiline ? 400 : 260));
      const left = Math.max(8, Math.min(cell.left, window.innerWidth - width - 8));
      const maxHeight = Math.max(120, Math.min(340, window.innerHeight - 24));
      const top = Math.max(8, Math.min(cell.top, window.innerHeight - Math.min(maxHeight, choices ? 200 : 70) - 8));
      setPosition({ left, top, width, maxHeight });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [anchor, choices, multiline]);
  useEffect(() => { if (choices) { if (choices.length > 8) searchInput.current?.focus(); else choiceList.current?.focus(); } else { input.current?.focus(); if(inputType === "text") input.current?.select(); } }, [choices,inputType]);
  useLayoutEffect(() => {
    if (!(input.current instanceof HTMLTextAreaElement)) return;
    input.current.style.height = "auto";
    input.current.style.height = `${Math.min(input.current.scrollHeight, Math.max(80, position.maxHeight - 20))}px`;
  }, [value, position.maxHeight]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || root.current?.contains(target) || anchor?.contains(target)) return;
      if (value === originalValue) { onCancel("outside"); return; }
      if (!onCommit(value,"outside")) { blockNextOutsideClick.current = true; event.preventDefault(); event.stopPropagation(); input.current?.focus(); }
    };
    const suppressInvalidClick = (event: MouseEvent) => {
      if (!blockNextOutsideClick.current) return;
      blockNextOutsideClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    };
    const clearInvalidClickGuard = () => requestAnimationFrame(() => { blockNextOutsideClick.current = false; });
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("pointerup", clearInvalidClickGuard, true);
    document.addEventListener("click", suppressInvalidClick, true);
    return () => { document.removeEventListener("pointerdown", outside, true); document.removeEventListener("pointerup", clearInvalidClickGuard, true); document.removeEventListener("click", suppressInvalidClick, true); };
  }, [anchor, value, originalValue, onCancel, onCommit]);
  const select = (choice: string) => { onChange(choice); onCommit(choice,"choice"); };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onCancel("keyboard"); return; }
    if (choices && event.key === "ArrowDown") { event.preventDefault(); if (visibleChoices.length) setActiveChoice(index => (index + 1) % visibleChoices.length); return; }
    if (choices && event.key === "ArrowUp") { event.preventDefault(); if (visibleChoices.length) setActiveChoice(index => (index - 1 + visibleChoices.length) % visibleChoices.length); return; }
    if (event.key === "Enter") {
      if (multiline && event.shiftKey) return;
      event.preventDefault(); event.stopPropagation();
      if (choices) { if (visibleChoices[activeChoice]) select(visibleChoices[activeChoice]); } else onCommit(value,"keyboard");
      return;
    }
    if (event.key === "Tab") {
      if (!onCommit(value,"tab")) { event.preventDefault(); return; }
      event.preventDefault(); onAdvance?.(event.shiftKey ? -1 : 1);
    }
  };
  if (!anchor || typeof document === "undefined") return null;
  return createPortal(<div className={`${styles.floatingCellEditor} ${choices ? styles.floatingCellChoices : ""}`} data-pd-id="lab.floating-cell-editor" onKeyDown={onKeyDown} ref={root} role="group" aria-label={`Edit ${label}`} tabIndex={choices ? 0 : -1} style={{ left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight }}>
    {children ?? (choices ? <>{choices.length > 8 ? <input aria-activedescendant={visibleChoices[activeChoice] ? `lab-cell-option-${activeChoice}` : undefined} aria-controls="lab-cell-options" aria-expanded="true" aria-label="Search Options" className={styles.floatingCellInput} onChange={event => {setChoiceQuery(event.target.value);setActiveChoice(0);}} placeholder="Search Options" ref={searchInput} role="combobox" type="search" value={choiceQuery}/> : null}<div aria-activedescendant={visibleChoices[activeChoice] ? `lab-cell-option-${activeChoice}` : undefined} aria-label={`${label} options`} className={styles.floatingChoiceList} id="lab-cell-options" ref={choiceList} role="listbox" tabIndex={0}>
      {visibleChoices.map((choice, index) => <button aria-selected={choice === value} className={`${styles.floatingChoice} ${index === activeChoice ? styles.floatingChoiceActive : ""}`} data-pd-id={`lab.cell-option.${choice}`} id={`lab-cell-option-${index}`} key={choice} onClick={() => select(choice)} role="option" tabIndex={-1} type="button"><span>{choice}</span>{choice === value ? <span aria-hidden="true" className="material-symbols-outlined">check</span> : null}</button>)}
      {!visibleChoices.length ? <span className={styles.floatingChoice}>No matching options</span> : null}
    </div></> : multiline ? <textarea aria-label={label} className={styles.floatingCellInput} onChange={event => onChange(event.target.value)} ref={input as React.RefObject<HTMLTextAreaElement>} rows={Math.min(8, Math.max(2, value.split("\n").length))} value={value}/> : <input aria-label={label} className={styles.floatingCellInput} onChange={event => onChange(event.target.value)} ref={input as React.RefObject<HTMLInputElement>} type={inputType} value={value}/>) }
    {error ? <p className={styles.floatingCellError} role="alert">{error}</p> : null}
  </div>, document.body);
}
