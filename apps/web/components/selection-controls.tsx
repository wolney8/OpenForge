"use client";

import { useRef, useState } from "react";

export type SelectionOption = { id: string; name: string; status?: string };
export type OptionListMode = "CLOSED" | "SEARCH_RESULTS" | "SHOW_ALL";

function normalizedSearch(value: string) {
  return value.normalize("NFKD").replace(/[\p{P}\p{S}\s]+/gu, "").toLocaleLowerCase("en-GB");
}

export function optionMatches(value: string, query: string) {
  return normalizedSearch(value).includes(normalizedSearch(query));
}

export function SearchableCombobox({
  dataPdId,
  id,
  label,
  mode,
  multiple = true,
  onChange,
  onModeChange,
  options,
  values,
}: {
  dataPdId?: string;
  id: string;
  label: string;
  mode: OptionListMode;
  multiple?: boolean;
  onChange: (values: string[]) => void;
  onModeChange: (mode: OptionListMode) => void;
  options: SelectionOption[];
  values: string[];
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = `${id}-options`;
  const open = mode !== "CLOSED";
  const selected = values.map((value) => options.find((option) => option.id === value) ?? { id: value, name: value });
  const available = mode === "SEARCH_RESULTS"
    ? options.filter((option) => optionMatches(option.name, query))
    : options;
  const resolvedActiveIndex = Math.min(activeIndex, Math.max(0, available.length - 1));
  const closeList = () => onModeChange("CLOSED");
  const select = (option: SelectionOption) => {
    if (!values.includes(option.id)) onChange(multiple ? [...values, option.id] : [option.id]);
    setQuery("");
    closeList();
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };
  const remove = (value: string) => {
    onChange(values.filter((item) => item !== value));
    setQuery("");
    closeList();
  };
  return <div className="pd-combobox-field" data-pd-id={dataPdId}>
    <span className="pd-combobox-label" id={`${id}-label`}>{label}</span>
    <div className={`pd-combobox-input${open ? " is-open" : ""}`} onClick={() => inputRef.current?.focus()}>
      <div className="pd-combobox-values">
        {selected.map((option) => <span className="pd-combobox-token" key={option.id}>
          <span>{option.name}</span>
          <button aria-label={`Remove ${option.name}`} onClick={(event) => { event.stopPropagation(); remove(option.id); }} type="button">×</button>
        </span>)}
        <input
          aria-activedescendant={open && available[resolvedActiveIndex] ? `${listId}-${available[resolvedActiveIndex].id}` : undefined}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          aria-labelledby={`${id}-label`}
          autoComplete="off"
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setActiveIndex(0);
            onModeChange(next.length ? "SEARCH_RESULTS" : "CLOSED");
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              if (!open) onModeChange("SHOW_ALL");
              else setActiveIndex((current) => Math.min(current + 1, available.length - 1));
            } else if (event.key === "ArrowUp" && open) {
              event.preventDefault();
              setActiveIndex((current) => Math.max(current - 1, 0));
            } else if (event.key === "Enter" && open && available[resolvedActiveIndex]) {
              event.preventDefault();
              select(available[resolvedActiveIndex]);
            } else if (event.key === "Backspace" && !query && values.length) {
              remove(values[values.length - 1]);
            } else if (event.key === "Escape" && open) {
              event.preventDefault();
              event.stopPropagation();
              closeList();
            }
          }}
          placeholder={values.length ? "Type to add" : `Search ${label.toLocaleLowerCase("en-GB")}`}
          ref={inputRef}
          role="combobox"
          type="text"
          value={query}
        />
      </div>
      {values.length ? <button aria-label={`Clear all ${label.toLocaleLowerCase("en-GB")}`} className="pd-combobox-action" onClick={(event) => { event.stopPropagation(); onChange([]); setQuery(""); closeList(); }} title="Clear all" type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button> : null}
      <button aria-label={`${open ? "Close" : "Show all"} ${label.toLocaleLowerCase("en-GB")} options`} className="pd-combobox-action" onClick={(event) => { event.stopPropagation(); setQuery(""); setActiveIndex(0); onModeChange(open ? "CLOSED" : "SHOW_ALL"); inputRef.current?.focus(); }} type="button"><span aria-hidden="true" className="material-symbols-outlined">{open ? "expand_less" : "expand_more"}</span></button>
    </div>
    {open ? <div aria-label={`${label} options`} aria-multiselectable={multiple || undefined} className="pd-combobox-options" id={listId} role="listbox">
      {available.length ? available.map((option, index) => {
        const isSelected = values.includes(option.id);
        return <button aria-selected={isSelected} className={`${index === resolvedActiveIndex ? "is-active" : ""}${isSelected ? " is-selected" : ""}`} id={`${listId}-${option.id}`} key={option.id} onClick={() => select(option)} role="option" type="button">
          <span><strong>{option.name}</strong>{option.status ? <small>{option.status}</small> : null}</span>
          {isSelected ? <span aria-hidden="true" className="material-symbols-outlined">check</span> : null}
        </button>;
      }) : <p className="field-hint">No matches</p>}
    </div> : null}
  </div>;
}

export type PresetGroup<T extends string> = { label: string | null; options: Array<[T, string]> };

export function PresetSelect<T extends string>({
  dataPdId,
  groups,
  id,
  label,
  onChange,
  onOpenChange,
  open,
  value,
}: {
  dataPdId?: string;
  groups: Array<PresetGroup<T>>;
  id: string;
  label: string;
  onChange: (value: T) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  value: T;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const options = groups.flatMap((group) => group.options);
  const selectedLabel = options.find(([candidate]) => candidate === value)?.[1] ?? options[0]?.[1] ?? "";
  const choose = (next: T) => {
    onChange(next);
    onOpenChange(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };
  return <div className="pd-combobox-field" data-pd-id={dataPdId}>
    <span className="pd-combobox-label" id={`${id}-label`}>{label}</span>
    <div className={`pd-combobox-input pd-preset-select${open ? " is-open" : ""}`}>
      <button aria-activedescendant={open && options[activeIndex] ? `${id}-option-${options[activeIndex][0]}` : undefined} aria-controls={`${id}-options`} aria-expanded={open} aria-labelledby={`${id}-label`} className="pd-preset-select-trigger" onClick={() => onOpenChange(!open)} onKeyDown={(event) => {
        if ((event.key === "ArrowDown" || event.key === "ArrowUp") && !open) { event.preventDefault(); onOpenChange(true); }
        else if (event.key === "ArrowDown" && open) { event.preventDefault(); setActiveIndex((current) => Math.min(current + 1, options.length - 1)); }
        else if (event.key === "ArrowUp" && open) { event.preventDefault(); setActiveIndex((current) => Math.max(current - 1, 0)); }
        else if ((event.key === "Enter" || event.key === " ") && open && options[activeIndex]) { event.preventDefault(); choose(options[activeIndex][0]); }
        else if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); onOpenChange(false); }
      }} ref={triggerRef} role="combobox" type="button"><span>{selectedLabel}</span><span aria-hidden="true" className="material-symbols-outlined">{open ? "expand_less" : "expand_more"}</span></button>
    </div>
    {open ? <div aria-label={`${label} options`} className="pd-combobox-options pd-grouped-options" id={`${id}-options`} role="listbox">
      {groups.map((group) => <div aria-label={group.label ?? selectedLabel} className="pd-option-group" key={group.label ?? "default"} role="group">
        {group.label ? <span className="eyebrow">{group.label}</span> : null}
        {group.options.map(([optionValue, optionLabel]) => {
          const index = options.findIndex(([candidate]) => candidate === optionValue);
          return <button aria-selected={value === optionValue} className={`${index === activeIndex ? "is-active" : ""}${value === optionValue ? " is-selected" : ""}`} id={`${id}-option-${optionValue}`} key={optionValue} onClick={() => choose(optionValue)} role="option" type="button"><span><strong>{optionLabel}</strong></span>{value === optionValue ? <span aria-hidden="true" className="material-symbols-outlined">check</span> : null}</button>;
        })}
      </div>)}
    </div> : null}
  </div>;
}
