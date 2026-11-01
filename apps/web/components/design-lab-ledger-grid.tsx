"use client";

import { useEffect, useRef, useState } from "react";
import { DesignLabSelect } from "@/components/design-lab-select";
import { SearchableCombobox, type OptionListMode } from "@/components/selection-controls";
import { labLedgerColumns, type LabLedgerKey, type LabRecord } from "@/lib/design-lab-connected-data";
import { labProfiles, type LabAccount, type LabScope } from "@/lib/design-lab-fixture";
import styles from "./design-lab-connected.module.css";

type Sort = { column: number | null; direction: "asc" | "desc" };
export type LabLedgerView = {
  filter: string;
  status: string;
  profile: string;
  advanced: { bookmaker: string; strategy: string; lay: string; back: string };
  sort: Sort;
  order: number[];
  widths: Record<number, number>;
};
export type LabEditableBet = {
  event: string; eventDate: string; offerName: string; offerText: string; bookmaker: string;
  exchange: string; strategy: string; backStake: string; backOdds: string; layOdds: string;
  requestedLayStake: string; matchedLayStake: string; commission: string;
};
export type LabLedgerRow = LabRecord & { onOpen: () => void };

const defaults = [106, 122, 190, 134, 158, 102, 125, 125, 132, 104, 76];
export function defaultLabLedgerView(key: LabLedgerKey): LabLedgerView {
  return {
    filter: "", status: "All statuses", profile: "All Profiles",
    advanced: { bookmaker: "Any bookmaker", strategy: "Any strategy", lay: "Any lay state", back: "Any back state" },
    sort: { column: null, direction: "asc" },
    order: labLedgerColumns[key].map((_, index) => index), widths: {},
  };
}

function numericValue(value: string): number | null {
  if (!value || /unknown|unavailable|current|planning|^—$/i.test(value)) return null;
  const parsed = Number(value.replace(/[£,%\s]/g, "").replace(/[()]/g, ""));
  return Number.isFinite(parsed) ? (value.includes("(") ? -parsed : parsed) : null;
}
function sortableValue(value: string, label: string): string | number | null {
  if (value === "—" || /unknown|unavailable|not entered/i.test(value)) return null;
  if (/date|settles|expiry/i.test(label)) { const date = Date.parse(value); return Number.isFinite(date) ? date : null; }
  if (/value|balance|amount|odds|stake|liability|rating/i.test(label)) return numericValue(value);
  if (/^status$/i.test(label)) return ({ Prospecting: 0, Placed: 1, Pending: 2, Settled: 3 } as Record<string, number>)[value] ?? value;
  return value.toLocaleLowerCase();
}
function validMoney(value: string, allowZero = false) {
  return /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) >= (allowZero ? 0 : 0.01);
}

export function DesignLabLedgerGrid({ ledgerKey, rows, scope, accounts, view, onViewChange, savedView, onSaveView, onOpenEntry, onOpenBalance, bet, onBetChange, betState, onRequestPlacement, scrollPosition, onScrollPosition }: {
  ledgerKey: LabLedgerKey;
  rows: LabLedgerRow[];
  scope: LabScope;
  accounts: LabAccount[];
  view: LabLedgerView;
  onViewChange: (next: LabLedgerView) => void;
  savedView: { section: LabLedgerKey; view: LabLedgerView } | null;
  onSaveView: (next: { section: LabLedgerKey; view: LabLedgerView }) => void;
  onOpenEntry: (mode: "modal" | "page") => void;
  onOpenBalance: (id: string) => void;
  bet: LabEditableBet;
  onBetChange: (patch: Partial<LabEditableBet>) => void;
  betState: string;
  onRequestPlacement: () => void;
  scrollPosition: { left: number; top: number };
  onScrollPosition: (position: { left: number; top: number }) => void;
}) {
  const columns = labLedgerColumns[ledgerKey];
  const actionIndex = columns.length - 1;
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ id: string; column: number } | null>(null);
  const [editing, setEditing] = useState<{ id: string; column: number; draft: Partial<LabEditableBet> } | null>(null);
  const [cellError, setCellError] = useState("");
  const [accountOptionMode, setAccountOptionMode] = useState<OptionListMode>("CLOSED");
  const [dropBefore, setDropBefore] = useState<number | null>(null);
  const pointer = useRef<{ mode: "resize" | "reorder"; index: number; startX: number; width: number } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const cellRef = useRef<HTMLElement | null>(null);
  const update = (patch: Partial<LabLedgerView>) => onViewChange({ ...view, ...patch });
  const width = (index: number) => view.widths[index] ?? (ledgerKey === "sportsbook" ? defaults[index] : 145);
  const active = [view.filter.trim(), view.status !== "All statuses", view.profile !== "All Profiles", ...Object.values(view.advanced).map(value => !value.startsWith("Any "))].filter(Boolean).length;
  const clearFilters = () => update({ ...defaultLabLedgerView(ledgerKey), sort:view.sort, order:view.order, widths:view.widths });

  useEffect(() => { if (scroller.current) { scroller.current.scrollLeft = scrollPosition.left; scroller.current.scrollTop = scrollPosition.top; } }, [ledgerKey, scrollPosition.left, scrollPosition.top]);
  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!pointer.current) return;
      const { mode, index, startX, width: startWidth } = pointer.current;
      if (mode === "resize") {
        onViewChange({ ...view, widths: { ...view.widths, [index]: Math.max(90, Math.min(360, startWidth + event.clientX - startX)) } });
      } else {
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-lab-column]");
        const next = target ? Number(target.dataset.labColumn) : null;
        setDropBefore(next === actionIndex ? null : next);
      }
    };
    const up = () => {
      const operation = pointer.current;
      if (operation?.mode === "reorder" && dropBefore !== null && operation.index !== dropBefore) {
        const order = view.order.filter(item => item !== operation.index);
        order.splice(order.indexOf(dropBefore), 0, operation.index);
        onViewChange({ ...view, order });
      }
      pointer.current = null; setDropBefore(null);
    };
    document.addEventListener("pointermove", move); document.addEventListener("pointerup", up);
    return () => { document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", up); };
  }, [view, dropBefore, actionIndex, onViewChange]);

  const filtered = rows.filter(row => {
    if (scope === "all" && view.profile !== "All Profiles" && row.profileId !== view.profile) return false;
    if (view.status !== "All statuses" && row.status !== view.status) return false;
    if (view.filter.trim() && ![row.title, row.subtitle, row.status, row.profileId, ...row.cells].join(" ").toLocaleLowerCase().includes(view.filter.trim().toLocaleLowerCase())) return false;
    if (ledgerKey === "sportsbook") {
      const fields = [["bookmaker", 1], ["strategy", 5], ["lay", 6], ["back", 7]] as const;
      if (fields.some(([name, index]) => !view.advanced[name].startsWith("Any ") && row.cells[index] !== view.advanced[name])) return false;
    }
    return true;
  });
  const sorted = filtered.map((row, index) => ({ row, index })).sort((a, b) => {
    if (view.sort.column === null) return a.index - b.index;
    const label = view.sort.column === -1 ? "Profile" : columns[view.sort.column];
    const valueA = view.sort.column === -1 ? labProfiles.find(profile => profile.id === a.row.profileId)?.name ?? "" : a.row.cells[view.sort.column] ?? "";
    const valueB = view.sort.column === -1 ? labProfiles.find(profile => profile.id === b.row.profileId)?.name ?? "" : b.row.cells[view.sort.column] ?? "";
    const parsedA = sortableValue(valueA, label), parsedB = sortableValue(valueB, label);
    if (parsedA === null) return parsedB === null ? a.index - b.index : 1;
    if (parsedB === null) return -1;
    const comparison = typeof parsedA === "number" && typeof parsedB === "number" ? parsedA - parsedB : String(parsedA).localeCompare(String(parsedB));
    return comparison === 0 ? a.index - b.index : comparison * (view.sort.direction === "asc" ? 1 : -1);
  }).map(item => item.row);
  const cycleSort = (column: number) => update({ sort: view.sort.column !== column ? { column, direction: "asc" } : view.sort.direction === "asc" ? { column, direction: "desc" } : { column: null, direction: "asc" } });
  const moveColumn = (index: number, direction: -1 | 1) => {
    const order = [...view.order], from = order.indexOf(index), to = from + direction;
    if (to < 0 || to >= order.length - 1 || index === actionIndex) return;
    [order[from], order[to]] = [order[to], order[from]];
    update({ order });
  };
  const editFields = (column: number): (keyof LabEditableBet)[] => ({
    0: ["eventDate"], 1: ["bookmaker"], 2: ["event"], 3: ["offerName"], 4: ["offerText"],
    5: ["strategy"], 6: ["exchange", "layOdds", "requestedLayStake", "matchedLayStake", "commission"], 7: ["backStake", "backOdds"], 9: [],
  } as Record<number, (keyof LabEditableBet)[]>)[column] ?? [];
  const startEdit = (row: LabLedgerRow, column: number) => {
    if (ledgerKey !== "sportsbook" || row.id !== "LAB-SB-NEW" || betState !== "Prospecting") return;
    if (column === 9) { setEditing({id:row.id,column,draft:{}}); setCellError(""); return; }
    if (!editFields(column).length) return;
    setEditing({ id: row.id, column, draft: Object.fromEntries(editFields(column).map(field => [field, bet[field]])) });
    setCellError("");
  };
  const commitEdit = () => {
    if (!editing) return;
    const draft = editing.draft;
    for (const field of ["backStake", "requestedLayStake", "matchedLayStake", "commission"] as const) {
      if (field in draft && draft[field] && !validMoney(draft[field], field === "commission")) { setCellError(`${field} must be a valid non-negative amount with at most two decimals.`); return; }
    }
    for (const field of ["backOdds", "layOdds"] as const) {
      if (field in draft && draft[field] && (!/^\d+(?:\.\d{1,3})?$/.test(draft[field]) || Number(draft[field]) <= 1)) { setCellError(`${field} must be decimal odds above 1.`); return; }
    }
    if (draft.matchedLayStake && Number(draft.matchedLayStake) > Number(draft.requestedLayStake ?? bet.requestedLayStake)) { setCellError("Matched Lay Stake cannot exceed requested Lay Stake."); return; }
    if (draft.eventDate && Number.isNaN(Date.parse(draft.eventDate))) { setCellError("Enter a valid event date and time."); return; }
    onBetChange(draft); setEditing(null); setCellError("");
    requestAnimationFrame(() => cellRef.current?.focus());
  };
  const accountOptions = (type: "Bookie" | "Exchange", profileId: string) => accounts.filter(account => account.profileId === profileId && account.type === type && account.status === "Active").map(account => account.name);
  const inputFor = (field: keyof LabEditableBet, row: LabLedgerRow) => {
    if (!editing) return null;
    const value = editing.draft[field] ?? "";
    const accountChoices = field === "bookmaker" ? accountOptions("Bookie", row.profileId) : field === "exchange" ? accountOptions("Exchange", row.profileId) : null;
    const label = ({eventDate:"Event date/time",offerName:"Offer Name",offerText:"Offer Details",backStake:"Back Stake",backOdds:"Back Odds",layOdds:"Lay Odds",requestedLayStake:"Requested Lay Stake",matchedLayStake:"Matched Lay Stake",commission:"Exchange Commission"} as Partial<Record<keyof LabEditableBet,string>>)[field] ?? field;
    if (accountChoices) return <SearchableCombobox dataPdId={`lab.cell.${field}`} id={`lab-cell-${field}`} key={field} label={label} mode={accountOptionMode} multiple={false} onChange={values => setEditing(current => current ? {...current,draft:{...current.draft,[field]:values[0] ?? ""}} : null)} onModeChange={setAccountOptionMode} options={accountChoices.map(name => ({id:name,name}))} values={value ? [value] : []}/>;
    if (field === "strategy") return <div className={styles.gridEditorField} key={field}><DesignLabSelect dataPdId="lab.cell.strategy" label="Strategy" onChange={next => setEditing(current => current ? {...current,draft:{...current.draft,strategy:next}} : null)} options={["Standard","Underlay","Overlay"].map(item => ({value:item,label:item}))} value={value}/></div>;
    return <label className={styles.gridEditorField} key={field}>{label}<input aria-label={label} autoFocus={editFields(editing.column)[0] === field} inputMode={/odds|stake|commission/i.test(field) ? "decimal" : undefined} onChange={event => setEditing(current => current ? { ...current, draft: { ...current.draft, [field]: event.target.value } } : null)} type={field === "eventDate" ? "datetime-local" : "text"} value={value}/></label>;
  };
  const renderHeader = (index: number) => {
    const label = index === -1 ? "Profile" : columns[index];
    const isAction = index === actionIndex;
    const sort = view.sort.column === index ? view.sort.direction : null;
    return <th aria-sort={sort ? sort === "asc" ? "ascending" : "descending" : undefined} className={dropBefore === index ? styles.gridDropTarget : undefined} data-lab-column={index} key={index} scope="col">
      <span className={styles.gridHeader}>{isAction ? label : <button aria-label={`Sort ${label}${sort ? ` ${sort}` : ""}`} className={styles.gridSort} onClick={() => cycleSort(index)} type="button">{label}<span aria-hidden="true">{sort === "asc" ? "↑" : sort === "desc" ? "↓" : ""}</span></button>}
        {index >= 0 && !isAction ? <><button aria-label={`Move ${label}`} className={styles.gridGrip} onPointerDown={event => { if (event.pointerType === "touch") return; event.preventDefault(); pointer.current = { mode: "reorder", index, startX: event.clientX, width: width(index) }; }} title={`Drag to reorder ${label}`} type="button"><span aria-hidden="true" className="material-symbols-outlined">drag_indicator</span></button><button aria-label={`Resize ${label}`} className={styles.gridResize} onPointerDown={event => { if (event.pointerType === "touch") return; event.preventDefault(); pointer.current = { mode: "resize", index, startX: event.clientX, width: width(index) }; }} title={`Drag to resize ${label}`} type="button" /></> : null}
      </span>
    </th>;
  };
  const ordered = scope === "all" ? [-1, ...view.order] : view.order;
  const tableWidth = view.order.reduce((sum, index) => sum + width(index), scope === "all" ? 134 : 0);
  const viewLabel = savedView?.section === ledgerKey && JSON.stringify(savedView.view) === JSON.stringify(view) ? "Saved lab view active" : JSON.stringify(view) === JSON.stringify(defaultLabLedgerView(ledgerKey)) ? "Default view" : "Custom view";
  return <section className={styles.surface} data-pd-id={`lab.ledger.${ledgerKey}`}><div className={styles.sectionHead}><div><h2>{ledgerKey === "sportsbook" ? "Sportsbook Bets" : ledgerKey === "accounts" ? "Accounts" : ledgerKey} ledger</h2><p>{sorted.length} of {rows.length} rows · {active ? `${active} active filter${active === 1 ? "" : "s"}` : "No filters"} · {scope === "all" ? "All Profiles" : labProfiles.find(profile => profile.id === scope)?.name} · {viewLabel}</p></div>{ledgerKey === "sportsbook" ? <div className={styles.actionRow}><button className={styles.secondaryButton} data-pd-id="lab.add.modal" onClick={() => onOpenEntry("modal")} type="button">Quick Capture</button><button className={styles.primaryButton} data-pd-id="lab.add.page" onClick={() => onOpenEntry("page")} type="button">Open Bet workbench</button></div> : null}</div>
    <div className={styles.toolbar}><label><span aria-hidden="true" className="material-symbols-outlined">search</span><input aria-label={`Filter ${ledgerKey} rows`} onChange={event => update({ filter: event.target.value })} placeholder="Search this ledger" type="search" value={view.filter}/></label><DesignLabSelect compact dataPdId="lab.ledger.status-filter" label="Status filter" onChange={status => update({ status })} options={["All statuses", ...new Set(rows.map(row => row.status))].map(value => ({ value, label: value }))} value={view.status}/>{scope === "all" ? <DesignLabSelect compact dataPdId="lab.ledger.profile-filter" label="Profile filter" onChange={profile => update({ profile })} options={[{value:"All Profiles",label:"All Profiles"},...labProfiles.map(profile => ({value:profile.id,label:profile.name}))]} value={view.profile}/> : null}{ledgerKey === "sportsbook" ? <button aria-expanded={advancedOpen} className={styles.secondaryButton} onClick={() => setAdvancedOpen(value => !value)} type="button">Filters</button> : null}{active ? <button className={styles.secondaryButton} onClick={clearFilters} type="button">Clear Filters</button> : null}<button aria-expanded={columnsOpen} className={styles.secondaryButton} onClick={() => setColumnsOpen(value => !value)} type="button">Columns</button><button className={styles.secondaryButton} onClick={() => update({ order: defaultLabLedgerView(ledgerKey).order, widths: {} })} type="button">Reset Columns</button><button className={styles.secondaryButton} onClick={() => onSaveView({ section: ledgerKey, view: structuredClone(view) })} type="button">Save lab view</button>{savedView?.section === ledgerKey ? <button className={styles.linkButton} onClick={() => onViewChange(structuredClone(savedView.view))} type="button">Load saved view</button> : null}</div>
    {advancedOpen && ledgerKey === "sportsbook" ? <div className={styles.advancedFilterGrid}>{([ ["bookmaker","Bookmaker",1,"Any bookmaker"], ["strategy","Strategy",5,"Any strategy"], ["lay","Lay state",6,"Any lay state"], ["back","Back state",7,"Any back state"] ] as const).map(([field,label,index,any]) => <DesignLabSelect dataPdId={`lab.ledger.filter.${field}`} key={field} label={label} onChange={value => update({ advanced: { ...view.advanced, [field]: value } })} options={[any,...new Set(rows.map(row => row.cells[index]).filter(value => value !== "—"))].map(value => ({value,label:value}))} value={view.advanced[field]}/>)}</div> : null}
    {columnsOpen ? <div aria-label="Keyboard column controls" className={styles.columnTools}>{view.order.filter(index => index !== actionIndex).map(index => <div key={index}><span>{columns[index]}</span><button aria-label={`Move ${columns[index]} left`} onClick={() => moveColumn(index,-1)} type="button">←</button><button aria-label={`Move ${columns[index]} right`} onClick={() => moveColumn(index,1)} type="button">→</button><button aria-label={`Widen ${columns[index]}`} onClick={() => update({widths:{...view.widths,[index]:Math.min(360,width(index)+20)}})} type="button">+</button><button aria-label={`Narrow ${columns[index]}`} onClick={() => update({widths:{...view.widths,[index]:Math.max(90,width(index)-20)}})} type="button">−</button></div>)}</div> : null}
    <div aria-label={`${ledgerKey} table, scroll horizontally for all columns`} className={styles.tableScroll} onScroll={event => onScrollPosition({ left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop })} ref={scroller} tabIndex={0}><table style={{width:tableWidth,minWidth:tableWidth,tableLayout:"fixed"}}><colgroup>{ordered.map(index => <col key={index} style={{width:index === -1 ? 134 : width(index)}}/>)}</colgroup><thead><tr>{ordered.map(renderHeader)}</tr></thead><tbody>{sorted.map(row => <tr aria-label={`Open ${row.title}, ${labProfiles.find(profile => profile.id === row.profileId)?.name}`} data-status={row.status} key={row.id} onClick={event => { if (event.target === event.currentTarget) row.onOpen(); }} onKeyDown={event => { if (event.target === event.currentTarget && event.key === "Enter") row.onOpen(); }} tabIndex={0}>{ordered.map(index => <td className={selectedCell?.id === row.id && selectedCell.column === index ? styles.gridSelectedCell : undefined} key={`${row.id}-${index}`} onClick={event => { event.stopPropagation(); if (index === actionIndex) return; if (ledgerKey === "accounts" && [1,5].includes(index)) { onOpenBalance(row.id); return; } setSelectedCell({id:row.id,column:index}); if (ledgerKey !== "sportsbook" || row.id !== "LAB-SB-NEW" || betState !== "Prospecting") row.onOpen(); }} onDoubleClick={event => { event.stopPropagation(); startEdit(row,index); }} onKeyDown={event => { if (event.key === "Enter" || event.key === "F2") { event.stopPropagation(); startEdit(row,index); } if (event.key === "Escape") { setEditing(null); setCellError(""); } }} ref={selectedCell?.id === row.id && selectedCell.column === index ? node => { cellRef.current = node; } : undefined} tabIndex={index === actionIndex ? -1 : 0}>
      {index === -1 ? <span className={styles.providerCell}>{labProfiles.find(profile => profile.id === row.profileId)?.name ?? row.profileId}</span> : index === actionIndex ? <button aria-label={`Open ${row.title}`} className={styles.tableAction} onClick={event => { event.stopPropagation(); row.onOpen(); }} type="button"><span aria-hidden="true" className="material-symbols-outlined">open_in_new</span></button> : editing?.id === row.id && editing.column === index ? <div className={styles.gridEditor} onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); setEditing(null); setCellError(""); requestAnimationFrame(() => cellRef.current?.focus()); } else if (event.key === "Enter" && index !== 9 && !(event.target instanceof Element && event.target.closest(".pd-combobox-field, [role=combobox]"))) { event.preventDefault(); event.stopPropagation(); commitEdit(); } }}>{index === 9 ? <DesignLabSelect compact dataPdId="lab.cell.status" label="Status" onChange={next => { if (next === "Placed") onRequestPlacement(); setEditing(null); }} options={[{value:"Prospecting",label:"Prospecting"},{value:"Placed",label:"Placed · confirm externally"}]} value="Prospecting"/> : editFields(index).map(field => inputFor(field,row))}{cellError ? <small role="alert">{cellError}</small> : null}{index !== 9 ? <div><button aria-label="Save cell" onClick={commitEdit} type="button">Save</button><button aria-label="Cancel cell edit" onClick={() => {setEditing(null);setCellError("");}} type="button">Cancel</button></div> : null}</div> : <span className={`${index === 8 && ledgerKey === "sportsbook" ? styles.financeCell : ""} ${index === 9 && ledgerKey === "sportsbook" ? styles.statusCell : ""}`}>{row.cells[index]}{index === 2 && ledgerKey === "sportsbook" ? <small className={styles.cellMeta}>{row.id}</small> : null}</span>}</td>)}</tr>)}</tbody></table></div>
    <div className={styles.mobileRows}>{sorted.map(row => <article key={row.id}><div><strong>{row.title}</strong><span className={styles.status}>{row.status}</span></div><p>{labProfiles.find(profile => profile.id === row.profileId)?.name} · {row.subtitle}</p><button className={styles.secondaryButton} onClick={row.onOpen} type="button">View all fields</button>{ledgerKey === "accounts" ? <button className={styles.secondaryButton} onClick={() => onOpenBalance(row.id)} type="button">Observe balance</button> : null}</article>)}</div>
    {!sorted.length ? <div className={styles.gridEmpty}><p>No rows match this view.</p>{active ? <button className={styles.secondaryButton} onClick={clearFilters} type="button">Clear Filters</button> : null}</div> : null}<p className={styles.tableNote}>Default column order preserves the ledger contract. Narrow summary opens all labelled fields; normal-app replacement is unapproved.</p>
  </section>;
}
