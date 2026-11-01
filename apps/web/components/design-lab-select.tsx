"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./design-lab-journey.module.css";

type Option<T extends string> = { value: T; label: string };

/** Lab-scoped single select using the platform's explicit-trigger/listbox pattern. */
export function DesignLabSelect<T extends string>({
  dataPdId, label, onChange, options, value, compact = false,
}: {
  dataPdId: string;
  label: string;
  onChange: (value: T) => void;
  options: readonly Option<T>[];
  value: T;
  compact?: boolean;
}) {
  const id = useId().replaceAll(":", "");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState({ top: 0, left: 0, width: 0, maxHeight: 280 });
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));

  const position = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const viewport = window.visualViewport;
    const leftEdge = viewport?.offsetLeft ?? 0;
    const topEdge = viewport?.offsetTop ?? 0;
    const width = Math.min(Math.max(rect.width, 190), window.innerWidth - 24);
    const left = Math.max(leftEdge + 12, Math.min(rect.left, leftEdge + window.innerWidth - width - 12));
    const spaceBelow = window.innerHeight - rect.bottom - 16;
    const spaceAbove = rect.top - topEdge - 16;
    const above = spaceBelow < 190 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(280, Math.max(120, above ? spaceAbove : spaceBelow));
    setPlacement({ top: above ? rect.top - maxHeight - 6 : rect.bottom + 6, left, width, maxHeight });
  }, []);

  useEffect(() => {
    if (!open) return;
    position();
    const dismiss = (event: PointerEvent) => {
      if (!triggerRef.current?.contains(event.target as Node) && !panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const leave = (event: FocusEvent) => {
      if (!triggerRef.current?.contains(event.target as Node) && !panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    const update = () => position();
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", leave);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", leave);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, [open, position]);

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    setOpen(false);
    triggerRef.current?.focus();
    onChange(option.value);
  };

  return <div className={`${styles.labSelect} ${compact ? styles.labSelectCompact : ""}`}>
    {!compact ? <span className={styles.labSelectLabel} id={`${id}-label`}>{label}</span> : null}
    <button
      aria-activedescendant={open ? `${id}-option-${active}` : undefined}
      aria-controls={`${id}-options`}
      aria-expanded={open}
      aria-haspopup="listbox"
      aria-label={compact ? `${label}: ${options[selectedIndex]?.label ?? ""}` : undefined}
      aria-labelledby={compact ? undefined : `${id}-label ${id}-selected`}
      className={styles.labSelectTrigger}
      data-pd-id={dataPdId}
      onClick={() => { position(); setActive(selectedIndex); setOpen((current) => !current); }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); triggerRef.current?.focus(); }
        else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          if (!open) { position(); setActive(Math.max(0, Math.min(options.length - 1, selectedIndex + (event.key === "ArrowDown" ? 1 : -1)))); setOpen(true); }
          else setActive((index) => Math.max(0, Math.min(options.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))));
        } else if ((event.key === "Enter" || event.key === " ") && open) { event.preventDefault(); choose(active); }
        else if (event.key === "Home" && open) { event.preventDefault(); setActive(0); }
        else if (event.key === "End" && open) { event.preventDefault(); setActive(options.length - 1); }
      }}
      ref={triggerRef}
      role="combobox"
      type="button"
    ><span id={`${id}-selected`}>{options[selectedIndex]?.label}</span><span aria-hidden="true" className="material-symbols-outlined">expand_more</span></button>
    {open ? createPortal(<div className={styles.labSelectPanel} id={`${id}-options`} ref={panelRef} role="listbox" aria-label={`${label} options`} style={placement}>
      {options.map((option, index) => <div aria-selected={index === selectedIndex} className={`${styles.labSelectOption} ${index === active ? styles.labSelectOptionActive : ""}`} id={`${id}-option-${index}`} key={option.value} onClick={() => choose(index)} role="option" tabIndex={-1}>
        <span>{option.label}</span>{index === selectedIndex ? <span aria-hidden="true" className="material-symbols-outlined">check</span> : null}
      </div>)}
    </div>, document.body) : null}
  </div>;
}
