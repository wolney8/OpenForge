"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { DesignLabSelect } from "@/components/design-lab-select";
import { DesignLedgerSearch } from "@/components/design-ledger-search";
import { DesignLedgerScreen, DesignLedgerToolbar, DesignLedgerToolbarAction, DesignLedgerPrimaryAction, DesignLedgerNarrowToggle, DesignLedgerMobileRows } from "@/components/design-ledger-screen";
import { DesignLabFloatingCellEditor } from "@/components/design-lab-floating-cell-editor";
import { labCellChoices, labCellControl, type LabEditResult, type LabFieldChange } from "@/lib/design-lab-field-edit";
import { labLedgerColumns, labLedgerColumnSpecs, labRecordInputs, type LabLedgerKey, type LabRecord } from "@/lib/design-lab-connected-data";
import { labProfiles, type LabAccount, type LabScope } from "@/lib/design-lab-fixture";
import styles from "./design-lab-connected.module.css";

type Sort = { column: number | null; direction: "asc" | "desc" };
export type LabLedgerView = {
  filter: string;
  status: string;
  profile: string;
  advanced: { bookmaker: string; strategy: string; lay: string; back: string };
  columnFilters: Record<string,string>;
  missing: "All readiness" | "Missing fields" | "Financial unavailable";
  dateFrom: string;
  dateTo: string;
  sort: Sort;
  order: number[];
  widths: Record<number, number>;
  hidden: number[];
};
export type LabEditableBet = {
  event: string; eventDate: string; offerName: string; offerText: string; bookmaker: string;
  exchange: string; strategy: string; backStake: string; backOdds: string; layOdds: string;
  requestedLayStake: string; matchedLayStake: string; commission: string;
};
export type LabLedgerRow = LabRecord & { onOpen: () => void };

function labStatusClass(field: string, value: string): string {
  if (field === "lay_status") return /partial/i.test(value) ? "table-chip-lay-partial" : /fully matched/i.test(value) ? "table-chip-lay-full" : "";
  if (field === "back_bet_status") return /settled|placed/i.test(value) ? "table-chip-back-placed" : "";
  if (value === "Placed") return "table-chip-status-placed";
  if (value === "Settled") return "table-chip-status-settled";
  if (value === "Awarded") return "table-chip-status-awarded";
  return "";
}

const defaults = [106, 122, 190, 134, 158, 102, 125, 125, 132, 104, 76];
const relevantFilters: Record<LabLedgerKey, readonly string[]> = {
  accounts: ["type","status","counts_in_cash_total"],
  sportsbook: ["bookmaker","match_strategy","lay_status","back_bet_status"],
  freeBets: ["bookmaker","match_strategy","lay_status","status"],
  casino: ["bookmaker","offer_type","status","result"],
  extraPlace: ["bookmaker","terms"],
  cash: ["direction","adjustment_type","linked_account","calculation_state"],
};
export function defaultLabLedgerView(key: LabLedgerKey): LabLedgerView {
  return {
    filter: "", status: "All statuses", profile: "All Profiles",
    advanced: { bookmaker: "Any bookmaker", strategy: "Any strategy", lay: "Any lay state", back: "Any back state" },
    columnFilters: {}, missing: "All readiness", dateFrom: "", dateTo: "",
    sort: { column: null, direction: "asc" },
    order: labLedgerColumns[key].map((_, index) => index), widths: {}, hidden: [],
  };
}

function numericValue(value: string): number | null {
  if (!value || /unknown|unavailable|planning|^—$|£—/i.test(value)) return null;
  const cleaned = value.replace(/current|final|settled/gi, "").replace(/[£,%\s]/g, "").replace(/[()]/g, "");
  if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? (value.includes("(") ? -Math.abs(parsed) : parsed) : null;
}
function financeTone(value: string): string {
  const amount = numericValue(value);
  return amount === null || amount === 0 ? "" : amount < 0 ? styles.negative : styles.positive;
}
function sortableValue(value: string, label: string, kind?: string): string | number | null {
  if (value === "—" || /unknown|unavailable|not entered/i.test(value)) return null;
  if (kind === "date" || /date|settles|expiry/i.test(label)) { const date = Date.parse(value.split("·")[0].trim()); return Number.isFinite(date) ? date : null; }
  if (kind === "money" || kind === "odds" || /value|balance|amount|odds|stake|liability|rating/i.test(label)) return numericValue(value);
  if (/^status$/i.test(label)) return ({ Prospecting: 0, Placed: 1, Pending: 2, Settled: 3 } as Record<string, number>)[value] ?? value;
  return value.toLocaleLowerCase();
}
function calendarDate(value: string): string | null {
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  if (iso) return iso[1];
  const parts = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/.exec(value.trim());
  if (!parts) return null;
  const month = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].findIndex(item => item.toLowerCase() === parts[2].toLowerCase());
  return month < 0 ? null : `${parts[3]}-${String(month+1).padStart(2,"0")}-${parts[1].padStart(2,"0")}`;
}
function urgencyCue(row: LabRecord): string | null {
  const today = Date.parse("2026-11-02");
  if (row.section === "freeBets" && row.status === "Available" && row.expiresAt && Date.parse(row.expiresAt) <= today) return "Expiry Today";
  if (row.section === "sportsbook" && /partial/i.test(row.cells[6] ?? "")) return "Partial Lay Review";
  if (row.section === "sportsbook" && row.status === "Placed" && row.dueDate && Date.parse(row.dueDate) < today) return "Event Passed";
  return null;
}

export function DesignLabLedgerGrid({ ledgerKey, rows, scope, accounts, view, onViewChange, savedView, onSaveView, onOpenEntry, onOpenConcept, onOpenBalance, onOpenReview, inputOverrides, bet, onFieldEdit, reviewIndicators, betState, onRequestPlacement, scrollPosition, onScrollPosition }: {
  ledgerKey: LabLedgerKey;
  rows: LabLedgerRow[];
  scope: LabScope;
  accounts: LabAccount[];
  view: LabLedgerView;
  onViewChange: (next: LabLedgerView) => void;
  savedView: { section: LabLedgerKey; view: LabLedgerView } | null;
  onSaveView: (next: { section: LabLedgerKey; view: LabLedgerView }) => void;
  onOpenEntry: (mode: "modal" | "page") => void;
  onOpenConcept: () => void;
  onOpenBalance: (id: string) => void;
  bet: LabEditableBet;
  onFieldEdit: (row: LabLedgerRow, changes: LabFieldChange[], originals: Record<string,string>) => LabEditResult;
  reviewIndicators: Record<string,string[]>;
  onOpenReview: (row:LabLedgerRow,column:number) => void;
  inputOverrides: Record<string,Record<string,string>>;
  betState: string;
  onRequestPlacement: () => void;
  scrollPosition: { left: number; top: number };
  onScrollPosition: (position: { left: number; top: number }) => void;
}) {
  const columns = labLedgerColumns[ledgerKey];
  const specs = labLedgerColumnSpecs(ledgerKey);
  const actionIndex = columns.length - 1;
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ id: string; column: number } | null>(null);
  const [editing, setEditing] = useState<{ id: string; column: number; value: string; draft?: Partial<LabEditableBet> } | null>(null);
  const [cellError, setCellError] = useState("");
  const [editGate, setEditGate] = useState<{ id:string; message:string } | null>(null);
  const [editorAnchor, setEditorAnchor] = useState<HTMLElement | null>(null);
  const [dropBefore, setDropBefore] = useState<number | null>(null);
  const pointer = useRef<{ mode: "resize" | "reorder"; index: number; startX: number; width: number } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const pan = useRef<{x:number;left:number;active:boolean;button:number} | null>(null);
  const suppressPanClick = useRef(false);
  const cellRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    // The floating editor owns outside interaction while editing so invalid
    // drafts can block dismissal. Otherwise selection belongs only to a cell.
    if (!selectedCell || editing) return;
    const clearOutsideCell = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("td") && scroller.current?.contains(target)) return;
      setSelectedCell(null);
    };
    document.addEventListener("pointerdown", clearOutsideCell, true);
    return () => document.removeEventListener("pointerdown", clearOutsideCell, true);
  }, [selectedCell, editing]);
  useEffect(() => {
    const clearOutsidePan = () => { pan.current = null; };
    document.addEventListener("pointerup", clearOutsidePan);
    document.addEventListener("pointercancel", clearOutsidePan);
    return () => { document.removeEventListener("pointerup", clearOutsidePan); document.removeEventListener("pointercancel", clearOutsidePan); };
  }, []);
  const update = (patch: Partial<LabLedgerView>) => onViewChange({ ...view, ...patch });
  const width = (index: number) => index === actionIndex ? 76 : view.widths[index] ?? (ledgerKey === "sportsbook" ? defaults[index] : 145);
  const active = [view.filter.trim(), view.status !== "All statuses", view.profile !== "All Profiles", ...Object.values(view.advanced).map(value => !value.startsWith("Any ")), ...Object.values(view.columnFilters).map(Boolean), view.missing !== "All readiness", view.dateFrom, view.dateTo].filter(Boolean).length;
  const clearFilters = () => update({ ...defaultLabLedgerView(ledgerKey), sort:view.sort, order:view.order, widths:view.widths, hidden:view.hidden });

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
    if (Object.entries(view.columnFilters).some(([column,value]) => value && row.cells[Number(column)] !== value)) return false;
    if (view.missing === "Missing fields" && !row.cells.some(value => /^(?:—|Unknown|Not entered|Event pending)$/i.test(value))) return false;
    if (view.missing === "Financial unavailable" && !row.cells.some((value,index) => specs[index]?.kind === "money" && /unknown|unavailable|£—|^—$/i.test(value))) return false;
    const dateColumn = ledgerKey === "freeBets" || ledgerKey === "casino" ? "expiry_datetime" : ledgerKey === "sportsbook" ? "date_settled" : ledgerKey === "extraPlace" ? "date" : ledgerKey === "cash" ? "adjustment_date" : "last_balance_update";
    const dateIndex = specs.findIndex(item => item.id === dateColumn);
    if (dateIndex >= 0 && (view.dateFrom || view.dateTo)) {
      const day = calendarDate(row.cells[dateIndex].split("·")[0]);
      if (!day || (view.dateFrom && day < view.dateFrom) || (view.dateTo && day > view.dateTo)) return false;
    }
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
    const kind = view.sort.column === -1 ? "text" : specs[view.sort.column]?.kind;
    const parsedA = sortableValue(valueA, label, kind), parsedB = sortableValue(valueB, label, kind);
    if (parsedA === null) return parsedB === null ? a.index - b.index : 1;
    if (parsedB === null) return -1;
    const comparison = typeof parsedA === "number" && typeof parsedB === "number" ? parsedA - parsedB : String(parsedA).localeCompare(String(parsedB));
    return comparison === 0 ? a.index - b.index : comparison * (view.sort.direction === "asc" ? 1 : -1);
  }).map(item => item.row);
  const cycleSort = (column: number) => update({ sort: view.sort.column !== column ? { column, direction: "asc" } : view.sort.direction === "asc" ? { column, direction: "desc" } : { column: null, direction: "asc" } });
  const autoFit = (index: number) => {
    const table = scroller.current?.querySelector("table");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!table || !context) return;
    context.font = getComputedStyle(table).font;
    const longest = Math.max(context.measureText(columns[index]).width + 65, ...rows.map(row => context.measureText(row.cells[index] ?? "").width + 30));
    update({widths:{...view.widths,[index]:Math.max(90,Math.min(360,Math.ceil(longest)))}});
  };
  const moveColumn = (index: number, direction: -1 | 1) => {
    const order = [...view.order], from = order.indexOf(index), to = from + direction;
    if (to < 0 || to >= order.length - 1 || index === actionIndex) return;
    [order[from], order[to]] = [order[to], order[from]];
    update({ order });
  };
  const sourceFor = (row: LabLedgerRow): Record<string,string> => row.id === "LAB-SB-NEW"
    ? {event_name:bet.event,offer_name:bet.offerName,offer_details:bet.offerText,bookmaker:bet.bookmaker,match_strategy:bet.strategy,date_settled:bet.eventDate,exchange:bet.exchange,back_stake:bet.backStake,back_odds:bet.backOdds,lay_odds:bet.layOdds,requested_lay_stake:bet.requestedLayStake,matched_lay_stake:bet.matchedLayStake,commission:bet.commission}
    : {...labRecordInputs[row.id], ...row.sourceInputs, ...inputOverrides[row.id]};
  const startEdit = (row: LabLedgerRow, column: number, anchor?: HTMLElement) => {
    setEditGate(null); setCellError("");
    const spec = specs[column];
    if (!spec || spec.edit === "actions") return;
    if (spec.edit === "balance-observation") { onOpenBalance(row.id); return; }
    if (spec.edit === "immutable" || spec.edit === "derived") {
      setEditGate({id:row.id,message:spec.edit === "immutable" ? `${spec.label} is immutable.` : `${spec.label} is calculated or observed. Review ${spec.relatedFields.join(", ")} in the source workflow.`}); return;
    }
    const financial = spec.edit === "financial-input" || spec.edit === "governed" || spec.edit === "planning-choice";
    const planning = row.status === "Prospecting" || row.status === "Draft" || (row.id === "LAB-SB-NEW" && betState === "Prospecting");
    if (financial && (!planning || spec.edit === "governed") && spec.id !== "status" && spec.id !== "result") { onOpenReview(row,column); return; }
    if (spec.edit === "planning-date" && !planning && ledgerKey !== "extraPlace") { onOpenReview(row,column); return; }
    if (spec.edit === "planning-account" && !planning) { onOpenReview(row,column); return; }
    if (ledgerKey === "sportsbook" && spec.edit === "financial-input" && [6,7].includes(column)) {
      // These cells are composite execution summaries; the shared populated
      // workbench is their reviewed editor, never a free-text status replacement.
      onOpenReview(row,column);
      return;
    }
    setEditorAnchor(anchor ?? cellRef.current);
    setEditing({id:row.id,column,value:sourceFor(row)[spec.id] ?? (spec.id === "status" ? row.status : "")});
  };
  const commitEdit = (nextValue: string, reason: "keyboard" | "outside" | "choice" | "tab"): boolean => {
    if (!editing) return true;
    const row=rows.find(item=>item.id===editing.id), spec=specs[editing.column];
    if (!row || !spec) return false;
    const originals=sourceFor(row);
    if (spec.id === "status") originals.status=row.status;
    if (!(spec.id in originals)) originals[spec.id]=row.cells[editing.column] === "—" ? "" : row.cells[editing.column];
    const fieldMap:Record<string,string>={eventDate:"date_settled",event:"event_name",offerName:"offer_name",offerText:"offer_details",bookmaker:"bookmaker",strategy:"match_strategy",exchange:"exchange",layOdds:"lay_odds",requestedLayStake:"requested_lay_stake",matchedLayStake:"matched_lay_stake",commission:"commission",backStake:"back_stake",backOdds:"back_odds"};
    const changes:LabFieldChange[]=editing.draft
      ? Object.entries(editing.draft).map(([field,value])=>({field:fieldMap[field]??field,value:value??""}))
      : [{field:spec.id,value:nextValue??editing.value}];
    if (row.id === "LAB-SB-NEW" && spec.id === "status" && changes[0].value === "Placed") { onRequestPlacement(); setEditing(null); if(reason==="outside")setSelectedCell(null); return true; }
    const result=onFieldEdit(row,changes,originals);
    if(result.outcome === "VALIDATION_FAILED" || result.outcome === "UNAVAILABLE") {setCellError(result.message??"This edit is unavailable.");return false;}
    if(result.outcome === "REVIEW_REQUIRED" || result.outcome === "GOVERNED_CORRECTION_REQUIRED") {setEditing(null);setCellError("");setSelectedCell(null);onOpenReview(row,editing.column);return true;}
    setEditing(null);setCellError("");if(reason==="outside")setSelectedCell(null);if(reason==="keyboard"||reason==="choice")requestAnimationFrame(()=>cellRef.current?.focus());return true;
  };
  const accountOptions = (type: "Bookie" | "Exchange", profileId: string) => accounts.filter(account => account.profileId === profileId && account.type === type && account.status === "Active").map(account => account.name);
  const filterIndices = relevantFilters[ledgerKey].map(id => specs.findIndex(item => item.id === id)).filter(index => index >= 0 && specs[index].id !== "status");
  const renderHeader = (index: number) => {
    const label = index === -1 ? "Profile" : columns[index];
    const isAction = index === actionIndex;
    const sort = view.sort.column === index ? view.sort.direction : null;
    return <th aria-sort={sort ? sort === "asc" ? "ascending" : "descending" : undefined} className={dropBefore === index ? styles.gridDropTarget : undefined} data-lab-column={index} key={index} scope="col">
      <span className={styles.gridHeader}>{isAction ? label : <button aria-label={`Sort ${label}${sort ? ` ${sort}` : ""}`} className={styles.gridSort} onClick={() => cycleSort(index)} type="button">{label}<span aria-hidden="true">{sort === "asc" ? "↑" : sort === "desc" ? "↓" : ""}</span></button>}
        {index >= 0 && !isAction ? <><button aria-label={`Move ${label}`} className={styles.gridGrip} onPointerDown={event => { if (event.pointerType === "touch") return; event.preventDefault(); pointer.current = { mode: "reorder", index, startX: event.clientX, width: width(index) }; }} title={`Drag to reorder ${label}`} type="button"><span aria-hidden="true" className="material-symbols-outlined">drag_indicator</span></button><button aria-label={`Resize ${label}`} className={styles.gridResize} onDoubleClick={event => {event.preventDefault();event.stopPropagation();autoFit(index);}} onPointerDown={event => { if (event.pointerType === "touch") return; event.preventDefault(); pointer.current = { mode: "resize", index, startX: event.clientX, width: width(index) }; }} title={`Drag to resize ${label}; double-click to auto-fit`} type="button" /></> : null}
      </span>
    </th>;
  };
  const ordered = scope === "all" ? [-1, ...view.order.filter(index=>!view.hidden.includes(index))] : view.order.filter(index=>!view.hidden.includes(index));
  const onCellKey = (event: ReactKeyboardEvent<HTMLTableCellElement>, row: LabLedgerRow, index: number) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === "F2") { event.preventDefault(); event.stopPropagation(); if (reviewIndicators[row.id]?.includes(specs[index]?.id)) onOpenReview(row,index); else startEdit(row,index,event.currentTarget); return; }
    if (event.key === "Escape") { setEditing(null); setCellError(""); return; }
    if (!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)) return;
    const rowIndex = sorted.findIndex(item => item.id === row.id);
    const columnIndex = ordered.indexOf(index);
    const targetRow = rowIndex + (event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0);
    const targetColumn = columnIndex + (event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0);
    const target = scroller.current?.querySelectorAll("tbody tr")[targetRow]?.querySelectorAll("td")[targetColumn];
    if (target instanceof HTMLElement) { event.preventDefault(); target.focus(); target.scrollIntoView({block:"nearest",inline:"nearest"}); }
  };
  const tableWidth = ordered.reduce((sum,index)=>sum+(index===-1?96:width(index)),0);
  const viewLabel = savedView?.section === ledgerKey && JSON.stringify(savedView.view) === JSON.stringify(view) ? "Saved lab view active" : JSON.stringify(view) === JSON.stringify(defaultLabLedgerView(ledgerKey)) ? "Default view" : "Custom view";
  const cancelCellEdit = (reason: "keyboard" | "outside") => {
    setEditing(null);
    setCellError("");
    if (reason === "outside") setSelectedCell(null);
    if (reason === "keyboard") requestAnimationFrame(() => cellRef.current?.focus());
  };
  const advanceCellEdit = (direction: -1 | 1) => {
    if (!editing) return;
    const row = rows.find(item => item.id === editing.id);
    const next = ordered[ordered.indexOf(editing.column) + direction];
    if (!row || next === undefined) return;
    const cell = scroller.current?.querySelector<HTMLElement>(`tr[data-lab-row-id="${row.id}"] td[data-lab-column="${next}"]`);
    requestAnimationFrame(() => cell?.focus());
  };
  const editingRow = editing ? rows.find(item => item.id === editing.id) : undefined;
  const editingSpec = editing ? specs[editing.column] : undefined;
  const editingOriginal = editingRow && editingSpec ? sourceFor(editingRow)[editingSpec.id] ?? (editingSpec.id === "status" ? editingRow.status : "") : "";
  const editingOptions = editingRow && editingSpec ? labCellChoices(ledgerKey, editingSpec.id, editingSpec.kind === "account" ? editingSpec.id === "exchange" ? accountOptions("Exchange", editingRow.profileId) : editingSpec.id === "linked_account" ? accounts.filter(account => account.profileId === editingRow.profileId && account.status === "Active").map(account => account.name) : accountOptions("Bookie", editingRow.profileId) : [], editingOriginal, sourceFor(editingRow).offer_type) : [];
  const editingControl = editingSpec ? labCellControl(ledgerKey,editingSpec.id,editingOriginal) : "text";
  const floatingEditor = editing && editorAnchor && editingRow && editingSpec ? <DesignLabFloatingCellEditor anchor={editorAnchor} label={`${editingSpec.label}, ${editingRow.title}, ${labProfiles.find(profile => profile.id === editingRow.profileId)?.name}`} value={editing.value} originalValue={editingOriginal} onChange={value => setEditing(current => current ? {...current,value} : null)} onCommit={commitEdit} onCancel={cancelCellEdit} error={cellError} choices={editingOptions.length ? editingOptions : undefined} inputType={editingControl === "date" || editingControl === "datetime-local" ? editingControl : "text"} multiline={editingSpec.id === "offer_details"} onAdvance={advanceCellEdit} /> : null;
  return <DesignLedgerScreen
    actions={ledgerKey === "sportsbook" ? <div className={styles.actionRow}><button className={styles.secondaryButton} data-pd-id="lab.add.modal" onClick={() => onOpenEntry("modal")} type="button">Quick Capture</button><DesignLedgerPrimaryAction dataPdId="lab.add.page" onClick={() => onOpenEntry("page")}>Open Bet Workbench</DesignLedgerPrimaryAction></div> : ledgerKey !== "accounts" ? <button className={styles.secondaryButton} data-pd-id={`lab.concept-add.${ledgerKey}`} onClick={onOpenConcept} type="button">Add {ledgerKey === "freeBets" ? "Free Bet" : ledgerKey === "casino" ? "Casino Offer" : ledgerKey === "extraPlace" ? "Extra Place" : "Cash Adjustment"} · Preview</button> : null}
    dataPdId={`lab.ledger.${ledgerKey}`}
    description={`${sorted.length} of ${rows.length} rows · ${active ? `${active} active filter${active === 1 ? "" : "s"}` : "No filters"} · ${scope === "all" ? "All Profiles" : labProfiles.find(profile => profile.id === scope)?.name} · ${viewLabel}`}
    title={{accounts:"Accounts",sportsbook:"Sportsbook Bets",freeBets:"Free Bets",casino:"Casino Offers",extraPlace:"Extra Place",cash:"Cash Adjustments"}[ledgerKey]}
  >
    <DesignLedgerToolbar><DesignLedgerSearch dataPdId={`lab.ledger.search.${ledgerKey}`} lab label={`Filter ${ledgerKey} rows`} onChange={event => update({ filter: event.target.value })} placeholder="Search This Ledger" value={view.filter}/><DesignLabSelect compact dataPdId="lab.ledger.status-filter" label="Status Filter" onChange={status => update({ status })} options={["All statuses", ...new Set(rows.map(row => row.status))].map(value => ({ value, label: value }))} value={view.status}/>{scope === "all" ? <DesignLabSelect compact dataPdId="lab.ledger.profile-filter" label="Profile Filter" onChange={profile => update({ profile })} options={[{value:"All Profiles",label:"All Profiles"},...labProfiles.map(profile => ({value:profile.id,label:profile.name}))]} value={view.profile}/> : null}<DesignLedgerToolbarAction ariaExpanded={advancedOpen} onClick={() => setAdvancedOpen(value => !value)}>Filters</DesignLedgerToolbarAction>{active ? <button className={styles.secondaryButton} onClick={clearFilters} type="button">Clear Filters</button> : null}<DesignLedgerToolbarAction ariaExpanded={columnsOpen} onClick={() => setColumnsOpen(value => !value)}>Columns</DesignLedgerToolbarAction><DesignLedgerToolbarAction onClick={() => update({ order: defaultLabLedgerView(ledgerKey).order, widths: {}, hidden: [] })}>Restore Default Columns</DesignLedgerToolbarAction><button className={styles.secondaryButton} onClick={() => onSaveView({ section: ledgerKey, view: structuredClone(view) })} type="button">Save Lab View</button>{savedView?.section === ledgerKey ? <button className={styles.linkButton} onClick={() => onViewChange(structuredClone(savedView.view))} type="button">Load Saved View</button> : null}<button className={styles.secondaryButton} onClick={() => scroller.current?.scrollBy({left: -320,behavior:"smooth"})} type="button" aria-label="Scroll table left">←</button><button className={styles.secondaryButton} onClick={() => scroller.current?.scrollBy({left: 320,behavior:"smooth"})} type="button" aria-label="Scroll table right">→</button></DesignLedgerToolbar>
    {advancedOpen ? <div className={styles.advancedFilterGrid} data-pd-id={`lab.ledger.filters.${ledgerKey}`}>
      {filterIndices.map(index => <DesignLabSelect dataPdId={`lab.ledger.filter.${specs[index].id}`} key={specs[index].id} label={specs[index].label} onChange={value => update({ columnFilters: { ...view.columnFilters, [index]: value } })} options={[{value:"",label:`Any ${specs[index].label}`},...new Set(rows.map(row => row.cells[index]).filter(value => value && value !== "—"))].map(item => typeof item === "string" ? {value:item,label:item} : item)} value={view.columnFilters[index] ?? ""}/>)}
      <DesignLabSelect dataPdId="lab.ledger.filter.readiness" label="Readiness" onChange={missing => update({missing:missing as LabLedgerView["missing"]})} options={["All readiness","Missing fields","Financial unavailable"].map(value => ({value,label:value}))} value={view.missing}/>
      {specs.some(item => item.kind === "date") ? <><label className={styles.gridFilterDate}>{ledgerKey === "freeBets" || ledgerKey === "casino" ? "Expiry From" : "From Date"}<input aria-label={ledgerKey === "freeBets" || ledgerKey === "casino" ? "Expiry From" : "From Date"} onChange={event => update({dateFrom:event.target.value})} type="date" value={view.dateFrom}/></label><label className={styles.gridFilterDate}>{ledgerKey === "freeBets" || ledgerKey === "casino" ? "Expiry To" : "To Date"}<input aria-label={ledgerKey === "freeBets" || ledgerKey === "casino" ? "Expiry To" : "To Date"} onChange={event => update({dateTo:event.target.value})} type="date" value={view.dateTo}/></label></> : null}
    </div> : null}
    {columnsOpen ? <div aria-label="Keyboard column controls" className={styles.columnTools}>{view.order.filter(index => index !== actionIndex).map(index => <div key={index}><span>{columns[index]}</span><button aria-label={`Move ${columns[index]} left`} onClick={() => moveColumn(index,-1)} type="button">←</button><button aria-label={`Move ${columns[index]} right`} onClick={() => moveColumn(index,1)} type="button">→</button><button aria-label={`Widen ${columns[index]}`} onClick={() => update({widths:{...view.widths,[index]:Math.min(360,width(index)+20)}})} type="button">+</button><button aria-label={`Narrow ${columns[index]}`} onClick={() => update({widths:{...view.widths,[index]:Math.max(90,width(index)-20)}})} type="button">−</button>{!specs[index].required ? <button aria-label={`${view.hidden.includes(index)?"Show":"Hide"} ${columns[index]}`} onClick={()=>update({hidden:view.hidden.includes(index)?view.hidden.filter(item=>item!==index):[...view.hidden,index]})} type="button">{view.hidden.includes(index)?"Show":"Hide"}</button> : null}</div>)}</div> : null}
    <DesignLedgerNarrowToggle expanded={mobileDetail} onToggle={() => setMobileDetail(current => !current)} />
    <div aria-label={`${ledgerKey} table, scroll horizontally for all columns`} className={`${styles.tableScroll} ${mobileDetail ? styles.tableHiddenForDetail : ""}`} data-pd-id={`lab.ledger-pan.${ledgerKey}`} onClickCapture={event => { if (suppressPanClick.current) { event.preventDefault(); event.stopPropagation(); suppressPanClick.current=false; } }} onPointerDown={event => { if ((event.button !== 0 && event.button !== 1) || event.pointerType === "touch" || !(event.target instanceof HTMLElement) || editing || pointer.current) return; if (event.button === 0 && event.target.tagName !== "TD") return; if (event.target.closest("button,input,[role=combobox],textarea,a")) return; if(event.button===1) {event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);} pan.current={x:event.clientX,left:event.currentTarget.scrollLeft,active:false,button:event.button}; }} onAuxClick={event=>{if(event.button===1 && (pan.current || suppressPanClick.current)) {event.preventDefault();event.stopPropagation();}}} onPointerMove={event => { if (!pan.current) return; const delta=event.clientX-pan.current.x; if (!pan.current.active && Math.abs(delta)<6) return; pan.current.active=true; event.currentTarget.scrollLeft=pan.current.left-delta; event.preventDefault(); }} onPointerUp={event => { if (pan.current?.active || pan.current?.button===1) {suppressPanClick.current=true;window.setTimeout(() => {suppressPanClick.current=false;},0);} if(event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); pan.current=null; }} onPointerCancel={event => {if(event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);pan.current=null;}} onKeyDown={event => { if (event.target !== event.currentTarget) return; if (event.key === "ArrowRight" || event.key === "ArrowLeft") {event.preventDefault();event.currentTarget.scrollLeft += event.key === "ArrowRight" ? 80 : -80;} }} onScroll={event => onScrollPosition({ left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop })} ref={scroller} tabIndex={0}><table style={{width:tableWidth,minWidth:tableWidth,tableLayout:"fixed"}}><colgroup>{ordered.map(index => <col key={index} style={{width:index === -1 ? 96 : width(index)}}/>)}</colgroup><thead><tr>{ordered.map(renderHeader)}</tr></thead><tbody>{sorted.map(row => <tr aria-label={`Open ${row.title}, ${labProfiles.find(profile => profile.id === row.profileId)?.name}${urgencyCue(row) ? `, ${urgencyCue(row)}` : ""}`} data-status={row.status} data-lab-row-id={row.id} data-urgent={Boolean(urgencyCue(row))} key={row.id} onClick={event => { if (event.target === event.currentTarget) row.onOpen(); }} onKeyDown={event => { if (event.target === event.currentTarget && event.key === "Enter") row.onOpen(); }} tabIndex={0}>{ordered.map(index => <td data-lab-column={index} className={`${reviewIndicators[row.id]?.includes(specs[index]?.id) ? styles.gridNeedsReview : ""} ${selectedCell?.id === row.id && selectedCell.column === index && !(editing?.id === row.id && editing.column === index) ? styles.gridSelectedCell : ""}`} key={`${row.id}-${index}`} onClick={event => { event.stopPropagation(); if (index === actionIndex) return; if (reviewIndicators[row.id]?.includes(specs[index]?.id)) { onOpenReview(row,index); return; } setSelectedCell({id:row.id,column:index}); }} onDoubleClick={event => { event.stopPropagation(); if (reviewIndicators[row.id]?.includes(specs[index]?.id)) return; startEdit(row,index,event.currentTarget); }} onKeyDown={event => onCellKey(event,row,index)} ref={selectedCell?.id === row.id && selectedCell.column === index ? node => { cellRef.current = node; } : undefined} tabIndex={index === actionIndex ? -1 : 0}>
      {index === -1 ? <span className={styles.providerCell}>{labProfiles.find(profile => profile.id === row.profileId)?.name ?? row.profileId}</span> : index === actionIndex ? <button aria-label={`Open ${row.title}`} className={styles.tableAction} onClick={event => { event.stopPropagation(); row.onOpen(); }} type="button"><span aria-hidden="true" className="material-symbols-outlined">open_in_new</span></button> : <span className={`${specs[index]?.kind === "money" ? styles.financeCell : ""} ${specs[index]?.kind === "status" || specs[index]?.kind === "result" ? `${styles.statusCell} ${labStatusClass(specs[index].id,row.cells[index])}` : ""} ${specs[index]?.kind === "money" ? financeTone(row.cells[index]) : ""}`} data-cell-value={specs[index]?.kind === "status" || specs[index]?.kind === "result" ? row.cells[index] : undefined}>{row.cells[index]}{["select","account","lifecycle"].includes(labCellControl(ledgerKey,specs[index].id,sourceFor(row)[specs[index].id])) ? <span aria-hidden="true" className={styles.gridChoiceCue}><span className="material-symbols-outlined">arrow_drop_down</span></span> : null}{reviewIndicators[row.id]?.includes(specs[index]?.id) ? <button aria-label={`Review ${specs[index]?.label} dependencies for ${row.title}`} className={styles.gridReviewCue} onClick={event=>{event.stopPropagation();onOpenReview(row,index);}} title="Review dependent financial or lifecycle fields" type="button"><span aria-hidden="true" className="material-symbols-outlined">warning</span></button> : null}{index === 0 && urgencyCue(row) ? <small className={styles.gridUrgencyCue}>{urgencyCue(row)}</small> : null}{index === 2 && ledgerKey === "sportsbook" ? <small className={styles.cellMeta}>{row.id}</small> : null}{(ledgerKey === "accounts" && index === 1 || ledgerKey === "sportsbook" && index === 1) ? <button aria-label={`Observe balance for ${row.cells[index]}, ${labProfiles.find(profile => profile.id === row.profileId)?.name}`} className={styles.gridAccountAction} onClick={event => { event.stopPropagation(); const account = ledgerKey === "accounts" ? accounts.find(item => item.id === row.id) : accounts.find(item => item.profileId === row.profileId && item.name === row.cells[index]); if (account) onOpenBalance(account.id); else setEditGate({id:row.id,message:"No eligible synthetic Account balance observation is linked to this provider."}); }} type="button"><span aria-hidden="true" className="material-symbols-outlined">account_balance_wallet</span></button> : null}</span>}</td>)}</tr>)}</tbody></table></div>
    {floatingEditor}
    {editGate ? <div className={styles.gridEditGate} role="status"><span aria-hidden="true" className="material-symbols-outlined">lock</span><span>{editGate.message}</span><button className={styles.secondaryButton} onClick={() => { const row=rows.find(item => item.id === editGate.id); row?.onOpen(); }} type="button">Open Full Record</button></div> : null}
    <DesignLedgerMobileRows dataPdId={`lab.ledger.details.${ledgerKey}`} expanded={mobileDetail} rows={sorted.map(row => ({
      id: row.id,
      title: row.title,
      status: row.status,
      subtitle: `${labProfiles.find(profile => profile.id === row.profileId)?.name} · ${row.subtitle}`,
      fields: specs.filter(item => item.id !== "actions").map(item => ({ key: item.id, label: item.label, value: row.cells[item.position] ?? "—" })),
      onOpen: row.onOpen,
      extraAction: ledgerKey === "accounts" ? <button className={styles.secondaryButton} onClick={() => onOpenBalance(row.id)} type="button">Observe Balance</button> : undefined,
    }))} />
    {!sorted.length ? <div className={styles.gridEmpty}><p>No rows match this view.</p>{active ? <button className={styles.secondaryButton} onClick={clearFilters} type="button">Clear Filters</button> : null}</div> : null}<p className={styles.tableNote}>Full table and labelled narrow detail retain every approved display field.</p>
  </DesignLedgerScreen>;
}
